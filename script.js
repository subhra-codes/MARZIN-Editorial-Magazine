$(document).ready(function () {
  const API_URL = "https://openlibrary.org/search.json";
  const FIELDS = "key,title,author_name,first_publish_year,cover_i,edition_count";
  const PAGE_SIZE = 12;
  const STORAGE_KEY = "margin_saved_books";
  let query = "architecture", page = 1, totalFound = 0, busy = false;
  let results = [], saved = readSaved(), showingSaved = false;

  updateSavedCount();

  $("#searchForm").on("submit", function (event) {
    event.preventDefault();
    const value = $("#searchInput").val().trim();
    if (!value) {
      showMessage("A search term is missing", "Enter a title, author or subject to query the catalogue.");
      return;
    }
    query = value; page = 1; results = []; showingSaved = false;
    $("#favoritesFilter").removeClass("active").attr("aria-pressed", "false");
    $(".topic-chip").removeClass("active");
    $("#booksGrid").empty(); $("#loadMoreWrap").prop("hidden", true);
    fetchBooks(false);
  });

  $(".topic-chip").on("click", function () {
    $("#searchInput").val($(this).data("query"));
    $(".topic-chip").removeClass("active");
    $(this).addClass("active");
    $("#searchForm").trigger("submit");
    $(this).addClass("active");
  });

  $("#loadMoreButton").on("click", function () {
    if (!busy && page * PAGE_SIZE < totalFound) { page += 1; fetchBooks(true); }
  });

  $("#sortSelect").on("change", function () {
    if (showingSaved) renderSaved();
    else if (results.length) renderBooks(sortItems(results.slice()));
  });

  $("#favoritesFilter").on("click", function () {
    showingSaved = !showingSaved;
    $(this).toggleClass("active", showingSaved).attr("aria-pressed", String(showingSaved));
    $("#loadMoreWrap").prop("hidden", true);
    if (showingSaved) {
      $("#resultsTitle").text("Your saved index.");
      renderSaved();
    } else {
      $("#resultsTitle").text("The current selection.");
      $("#resultsMeta").text("SHOWING " + results.length + " OF " + totalFound);
      renderBooks(sortItems(results.slice()));
      $("#loadMoreWrap").prop("hidden", page * PAGE_SIZE >= totalFound);
    }
  });

  function fetchBooks(append) {
    if (busy) return;
    busy = true; setLoading(true);
    if (!append) {
      $("#statusArea").html('<div class="loading-state"><span class="spinner"></span> PULLING RECORDS FROM THE OPEN INDEX...</div>');
      $("#resultsTitle").text("Searching the index.");
      $("#resultsMeta").text("REQUEST IN PROGRESS");
    } else $("#loadMoreButton").text("FETCHING NEXT PAGE...");

    // Required lab implementation: jQuery AJAX GET request returning JSON.
    $.ajax({
      url: API_URL, method: "GET", dataType: "json", timeout: 15000,
      data: { q: query, fields: FIELDS, limit: PAGE_SIZE, page: page }
    }).done(function (response) {
      if (!response || !Array.isArray(response.docs)) {
        showMessage("Unexpected API response", "The catalogue returned data in an unexpected format.");
        return;
      }
      totalFound = Number(response.numFound || response.num_found || 0);
      if (append) results = results.concat(response.docs);
      else results = response.docs.slice();
      $("#statusArea").empty();
      if (!results.length) {
        showMessage("Nothing in this index yet", "Try a broader search or a different spelling.");
        $("#resultsMeta").text("0 RECORDS FOUND");
        return;
      }
      renderBooks(sortItems(results.slice()));
      const shown = Math.min(page * PAGE_SIZE, totalFound);
      $("#resultsTitle").text("The current selection.");
      $("#resultsMeta").text("SHOWING " + shown + " OF " + totalFound + " RECORDS");
      $("#loadMoreWrap").prop("hidden", shown >= totalFound || response.docs.length < PAGE_SIZE);
    }).fail(function (xhr, status) {
      let msg = "The catalogue could not be reached. Check your connection and try again.";
      if (status === "timeout") msg = "The request took too long. Please try again.";
      if (xhr.status === 429) msg = "The catalogue is busy. Wait a moment before trying again.";
      showMessage("The index is temporarily unavailable", msg, true);
      $("#resultsMeta").text("REQUEST FAILED");
    }).always(function () {
      busy = false; setLoading(false);
    });
  }

  function renderBooks(items) {
    const html = items.map(function (book) {
      const titleText = book.title || "Untitled record";
      const title = escapeHtml(titleText);
      const authorText = Array.isArray(book.author_name) && book.author_name.length
        ? book.author_name.slice(0, 2).join(", ") : "AUTHOR NOT LISTED";
      const key = book.key || "";
      const id = bookId(book);
      const cover = book.cover_i
        ? '<img src="https://covers.openlibrary.org/b/id/' + encodeURIComponent(book.cover_i) + '-M.jpg" alt="Cover of ' + title + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.hidden=false;"><div class="cover-placeholder" hidden>' + title + '</div>'
        : '<div class="cover-placeholder">' + title + '</div>';
      const savedBook = saved.some(function (item) { return bookId(item) === id; });
      const href = key ? "https://openlibrary.org" + key : "https://openlibrary.org/search?q=" + encodeURIComponent(titleText);
      return '<article class="book-card"><div class="cover-wrap">' + cover +
        '<button class="save-button ' + (savedBook ? "saved" : "") + '" type="button" data-id="' + escapeHtml(id) + '" aria-label="Toggle saved book" aria-pressed="' + savedBook + '">' + (savedBook ? "♥" : "♡") + '</button></div>' +
        '<div class="book-info"><h3 class="book-title" title="' + title + '">' + title + '</h3>' +
        '<p class="book-author">' + escapeHtml(authorText) + '</p>' +
        '<div class="book-details"><span>' + escapeHtml(String(book.first_publish_year || "YEAR N/A")) + '</span><span class="edition-tag">' + Number(book.edition_count || 0).toLocaleString() + ' EDITIONS</span></div>' +
        '<a class="book-link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">OPEN RECORD ↗</a></div></article>';
    }).join("");
    $("#booksGrid").html(html);
    $("#booksGrid .save-button").on("click", toggleSaved);
  }

  function toggleSaved() {
    const id = $(this).data("id");
    const existing = saved.some(function (book) { return bookId(book) === id; });
    if (existing) saved = saved.filter(function (book) { return bookId(book) !== id; });
    else {
      const found = results.find(function (book) { return bookId(book) === id; }) ||
        saved.find(function (book) { return bookId(book) === id; });
      if (found) saved.push(found);
    }
    persistSaved(); updateSavedCount();
    if (showingSaved) renderSaved();
    else renderBooks(sortItems(results.slice()));
  }

  function renderSaved() {
    $("#statusArea").empty();
    $("#resultsMeta").text(saved.length + " SAVED RECORD" + (saved.length === 1 ? "" : "S"));
    if (!saved.length) {
      $("#booksGrid").empty();
      showMessage("Your index is empty", "Use the heart on a book record to keep it here for another day.");
      return;
    }
    renderBooks(sortItems(saved.slice()));
  }

  function sortItems(items) {
    const mode = $("#sortSelect").val();
    if (mode === "newest") items.sort(function (a,b) { return (b.first_publish_year || 0) - (a.first_publish_year || 0); });
    if (mode === "oldest") items.sort(function (a,b) { return (a.first_publish_year || 9999) - (b.first_publish_year || 9999); });
    if (mode === "title") items.sort(function (a,b) { return (a.title || "").localeCompare(b.title || ""); });
    return items;
  }
  function bookId(book) { return book.key || (book.title || "Untitled") + "|" + (Array.isArray(book.author_name) ? book.author_name.join(",") : ""); }
  function readSaved() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) { return []; } }
  function persistSaved() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (e) { console.warn("Saved index unavailable", e); } }
  function updateSavedCount() {
    const count = String(saved.length).padStart(2, "0");
    $("#favoriteCount,#savedCountSmall").text(count);
  }
  function setLoading(value) {
    $("#loadButton").prop("disabled", value);
    $("#loadButton .button-label").text(value ? "SEARCHING" : "SEARCH INDEX");
    $("#loadButton .button-arrow").text(value ? "…" : "↗");
    $("#searchInput").prop("disabled", value);
    $("#loadMoreButton").prop("disabled", value);
    if (!value) $("#loadMoreButton").html("LOAD NEXT PAGE <span>↓</span>");
  }
  function showMessage(title, message, retry) {
    let html = '<div class="message-state"><span class="empty-index">NOTICE / 0' + (retry ? "1" : "0") + '</span><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(message) + '</p>';
    if (retry) html += '<button class="retry-button" id="retryButton" type="button">RETRY REQUEST ↗</button>';
    html += '</div>';
    $("#statusArea").html(html);
    if (retry) $("#retryButton").on("click", function () { fetchBooks(false); });
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
});

// Editorial feature links launch a real catalogue search.
$(document).on("click", "[data-feature-query]", function () {
  const term = $(this).data("feature-query");
  $("#searchInput").val(term);
  $("#searchForm").trigger("submit");
});
