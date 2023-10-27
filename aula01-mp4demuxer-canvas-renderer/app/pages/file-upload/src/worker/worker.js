// https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
// Workers fazem o processamento numa thread paralela, sem interferir a interface do usuário.

onmessage = ({ data }) => {
  debugger;
  setTimeout(() => {
    self.postMessage({
      status: "done",
    });
  }, 2000);
};
