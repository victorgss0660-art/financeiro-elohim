window.importarModule = {

  handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);

      console.log("IMPORTADO:", data);
      utils.setAppMsg("Planilha carregada (console)", "ok");
    };

    reader.readAsBinaryString(file);
  }

};
