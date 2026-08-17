import { icon } from '../icons.js';
import { addPhotoBlob, photoUrl } from '../store.js';

// Renders captured photo tiles (async image fill) + a dashed "ADD" tile that
// opens the device camera via a hidden file input (capture="environment").
export function photoRow(photoIds, { addLabel = 'ADD' } = {}) {
  const tiles = photoIds.map((id) => `
    <div class="photo-tile captured" data-photo-id="${id}">
      <img data-photo-img="${id}" alt="">
      <span class="cap-label">PHOTO</span>
    </div>`).join('');
  return `<div class="photo-row" data-photo-row>
    ${tiles}
    <button type="button" class="photo-tile add" data-action="add-photo">
      ${icon('camera', { size: 24, color: '#747678', strokeWidth: 1.8 })}
      <span class="add-label">${addLabel}</span>
    </button>
    <input type="file" accept="image/*" capture="environment" data-photo-input style="display:none">
  </div>`;
}

export async function fillPhotoImages(root) {
  const imgs = root.querySelectorAll('[data-photo-img]');
  for (const img of imgs) {
    const id = Number(img.dataset.photoImg);
    const url = await photoUrl(id);
    if (url) img.src = url;
  }
}

export function wirePhotoRow(root, onAdded) {
  const input = root.querySelector('[data-photo-input]');
  const addBtn = root.querySelector('[data-action="add-photo"]');
  if (!input || !addBtn) return;
  addBtn.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const id = await addPhotoBlob(file);
    input.value = '';
    onAdded(id);
  });
}
