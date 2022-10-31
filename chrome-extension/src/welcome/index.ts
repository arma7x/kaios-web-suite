import Welcome from "./Welcome.svelte";

const target = document.getElementById("app");

document.addEventListener("DOMContentLoaded", new Welcome({ target }));
