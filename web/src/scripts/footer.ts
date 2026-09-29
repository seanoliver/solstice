const gh = document.querySelector(".gh-link");
if (gh) {
  const foot = document.createElement("div");
  foot.className = "web-foot";
  const privacy = document.createElement("a");
  privacy.className = "web-privacy";
  privacy.href = "/privacy/";
  privacy.textContent = "Privacy";
  gh.replaceWith(foot);
  foot.append(gh, privacy);
}
