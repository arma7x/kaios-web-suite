import Dashboard from "./dashboard.svelte";

const target = document.getElementById("app");

document.addEventListener("DOMContentLoaded", new Dashboard({ target }));
