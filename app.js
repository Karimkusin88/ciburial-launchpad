// Ciburial Launchpad — progressive enhancement only.
// 1) Copy-to-clipboard for contract addresses.
// 2) Live reads from GIWA Sepolia (totalSupply + latest block) via plain
//    JSON-RPC fetch. If anything fails, the verified snapshot values already
//    in the HTML stay in place — the page never breaks.
(function () {
  "use strict";

  // --- Copy buttons -------------------------------------------------------
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      function done() {
        var old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = old; }, 1400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) { /* no-op */ }
        document.body.removeChild(ta);
        done();
      }
    });
  });

  // --- Live chain reads ---------------------------------------------------
  var RPC = "https://sepolia-rpc.giwa.io";
  var TOKEN = "0x0503D6E81429df3F518a64Cc4b05c4618DbE7708";
  var DECIMALS = 9n;

  function rpc(method, params) {
    return fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params })
    }).then(function (res) {
      if (!res.ok) throw new Error("RPC HTTP " + res.status);
      return res.json();
    }).then(function (json) {
      if (json.error) throw new Error("RPC error");
      return json.result;
    });
  }

  function formatToken(rawHex) {
    var raw = BigInt(rawHex);
    var base = 10n ** DECIMALS;
    var whole = raw / base;
    var frac = raw % base;
    // Two decimal places, rounded half-up on the third decimal.
    var scaled = (frac * 1000n) / base;
    var cents = scaled / 10n;
    if (scaled % 10n >= 5n) cents += 1n;
    if (cents === 100n) { whole += 1n; cents = 0n; }
    var wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return wholeStr + "." + cents.toString().padStart(2, "0") + " CBRL";
  }

  var supplyEl = document.getElementById("total-supply");
  var noteEl = document.getElementById("live-note");
  var blockEl = document.getElementById("block-note");
  if (!supplyEl || !noteEl) return;

  Promise.all([
    rpc("eth_call", [{ to: TOKEN, data: "0x18160ddd" }, "latest"]),
    rpc("eth_blockNumber", [])
  ]).then(function (results) {
    supplyEl.textContent = formatToken(results[0]);
    var block = parseInt(results[1], 16);
    noteEl.textContent = "Live from GIWA Sepolia";
    noteEl.classList.add("live");
    if (blockEl && !isNaN(block)) {
      blockEl.textContent = " · latest block " + block.toLocaleString("en-US");
    }
  }).catch(function () {
    // Snapshot values from the build report remain; nothing to do.
  });
})();
