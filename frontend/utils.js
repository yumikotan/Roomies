// Shared utility functions

// Custom alert modal function
export function showCustomAlert(message, title = "") {
  const modal = document.getElementById("custom-alert-modal");
  const titleEl = document.getElementById("custom-alert-title");
  const messageEl = document.getElementById("custom-alert-message");
  const okBtn = document.getElementById("custom-alert-ok");
  
  if (!modal || !messageEl || !okBtn) {
    alert(message);
    return;
  }
  
  if (titleEl) titleEl.textContent = title;
  messageEl.textContent = message;
  modal.classList.remove("hidden");
  
  okBtn.onclick = () => {
    modal.classList.add("hidden");
  };
}


window.showCustomAlert = showCustomAlert;
