import Welcome from "src/components/Welcome.svelte";

const target = document.getElementById("app");

document.addEventListener("DOMContentLoaded", new Welcome({ target }));
