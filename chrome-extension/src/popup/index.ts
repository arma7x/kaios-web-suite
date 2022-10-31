import Popup from "./Popup.svelte";

const target = document.getElementById("app");

document.addEventListener("DOMContentLoaded", new Popup({ target }));
