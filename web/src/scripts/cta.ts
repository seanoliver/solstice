const KEY = "webCtaDismissed";

const app = document.getElementById("app")!;
const banner = document.querySelector<HTMLElement>("[data-cta-banner]")!;
const bannerLink = banner.querySelector<HTMLAnchorElement>("[data-cta-link]")!;

function topbarButton() {
  const a = bannerLink.cloneNode(true) as HTMLAnchorElement;
  a.classList.add("cta-top");
  return a;
}

// Without the observer the button disappears after the 24h toggle, a resize, or Edit.
function mountTopbarButton() {
  const place = () => {
    const right = app.querySelector(".topright");
    if (!right || right.querySelector(".cta-top")) return;
    const fmt = right.querySelector(".fmt");
    if (fmt) fmt.after(topbarButton());
    else right.append(topbarButton());
  };
  place();
  new MutationObserver(place).observe(app, { childList: true, subtree: true });
}

function dismissed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

if (dismissed()) {
  banner.remove();
  mountTopbarButton();
} else {
  banner.querySelector("[data-cta-close]")!.addEventListener("click", () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    banner.remove();
    mountTopbarButton();
    const top = app.querySelector<HTMLElement>(".cta-top");
    if (top && top.getClientRects().length) top.focus();
    else app.querySelector<HTMLElement>(".edit-toggle")?.focus();
  });
}
