(() => {
  const selectedImg = document.querySelector(".lookbook-selected-img");
  const buttons = Array.from(document.querySelectorAll(".lookbook-thumb"));

  if (!(selectedImg instanceof HTMLImageElement) || buttons.length === 0) return;

  const setSelected = (button) => {
    const src = button.getAttribute("data-src");
    if (!src) return;

    selectedImg.src = src;

    for (const btn of buttons) btn.classList.remove("is-active");
    button.classList.add("is-active");
  };

  for (const button of buttons) {
    button.addEventListener("click", () => setSelected(button));
  }
})();
