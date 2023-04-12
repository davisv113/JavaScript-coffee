const inputAgua = document.querySelector("#quantidade-agua");
const inputCafe = document.querySelector("#quantidade-cafe");
const inputAçucar = document.querySelector("#quantidade-açucar");

function calcularCafe(quantidadeAgua) {
  const quantidadeCafe = quantidadeAgua * 0.0973;
  return quantidadeCafe;
}

function calcularAcucar(quantidadeAgua) {
  const quantidadeAcucar = quantidadeAgua * 0.125;
  return quantidadeAcucar;
}

inputAgua.addEventListener("input", () => {
  const quantidadeAgua = inputAgua.value;

  if (quantidadeAgua > 0) {
    inputCafe.value = calcularCafe(quantidadeAgua).toFixed(2);
    inputAçucar.value = calcularAcucar(quantidadeAgua).toFixed(2);
  } else {
    inputCafe.value = "";
    inputAçucar.value = "";
  }
});
