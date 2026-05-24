(() => {
  const selectedImg = document.querySelector(".lookbook-selected-img");
  const grid = document.querySelector(".lookbook-grid");

  if (!selectedImg || !grid) return;

  const basePath = "media/lookbook/";
  const maxImages = 100; // Aumentamos el límite por si acaso
  let firstImageSet = false;

  const createThumb = (index) => {
    // Probamos diferentes formatos de nombre (01, 001, 1, etc)
    const formats = [
      String(index).padStart(2, "0"), // 01, 02... 10, 11
      String(index).padStart(3, "0"), // 001, 002... 010, 011
      String(index)                   // 1, 2... 10, 11
    ];

    let found = false;

    const tryLoad = (fmtIndex) => {
      if (fmtIndex >= formats.length || found) return;

      const src = basePath + formats[fmtIndex] + ".jpg";
      const imgTest = new Image();
      imgTest.src = src;

      imgTest.onload = () => {
        if (found) return; // Evitar duplicados si varias rutas funcionan
        found = true;

        const button = document.createElement("button");
        button.className = "lookbook-thumb";
        button.type = "button";
        button.setAttribute("data-src", src);
        button.setAttribute("aria-label", `Seleccionar imagen ${index}`);

        const thumbImg = document.createElement("img");
        thumbImg.src = src;
        thumbImg.alt = "";

        button.appendChild(thumbImg);
        grid.appendChild(button);

        if (!firstImageSet) {
          selectedImg.src = src;
          button.classList.add("is-active");
          firstImageSet = true;
        }

        button.addEventListener("click", () => {
          const allButtons = grid.querySelectorAll(".lookbook-thumb");
          for (const btn of allButtons) btn.classList.remove("is-active");
          button.classList.add("is-active");
          selectedImg.src = src;
        });
      };

      imgTest.onerror = () => {
        tryLoad(fmtIndex + 1);
      };
    };

    tryLoad(0);
  };

  for (let i = 1; i <= maxImages; i++) {
    createThumb(i);
  }
})();
