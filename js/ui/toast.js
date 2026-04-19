/** @param {string} message @param {'success'|'danger'|'secondary'} [variant] */
export function showToast(message, variant = "secondary") {
  const wrap = document.getElementById("toast-container");
  if (!wrap) return;

  const bg =
    variant === "success"
      ? "text-bg-success"
      : variant === "danger"
        ? "text-bg-danger"
        : "text-bg-secondary";

  const el = document.createElement("div");
  el.className = `toast align-items-center ${bg} border-0`;
  el.setAttribute("role", "status");
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  wrap.appendChild(el);
  const Toast = window.bootstrap?.Toast;
  if (Toast) {
    const t = new Toast(el, { delay: 4000 });
    t.show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
  } else {
    el.classList.add("show");
    setTimeout(() => el.remove(), 4000);
  }
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
