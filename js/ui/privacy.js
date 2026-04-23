import { navigateHome } from "../router.js";

/**
 * @param {HTMLElement} root
 */
export function renderPrivacy(root) {
  root.innerHTML = `
    <div class="sp-privacy-view flex-grow-1 d-flex flex-column">
      <div class="container py-4 py-md-5 flex-grow-1">
        <div class="sp-privacy-card mx-auto">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h1 class="h3 mb-0">Privacy Notice</h1>
            <button type="button" class="btn btn-outline-secondary btn-sm" id="sp-privacy-back">Back</button>
          </div>
          <p class="text-muted mb-4">Last updated: ${new Date().toISOString().slice(0, 10)}</p>

          <h2 class="h5">What data is stored</h2>
          <p class="mb-3">Spektrum stores the minimum data required to run multiplayer rooms and keep your session usable between visits.</p>
          <ul>
            <li><strong>Player identity:</strong> player name and player id/uuid.</li>
            <li><strong>Room metadata:</strong> room uuid and room name (room names may include player names, e.g. "Alex's room").</li>
            <li><strong>Gameplay data:</strong> team assignments, active player, clue/guess values, round state, and scores.</li>
            <li><strong>Client preferences:</strong> background music on/off and music volume.</li>
          </ul>

          <h2 class="h5 mt-4">Where data is stored</h2>
          <p class="mb-2"><strong>Backend API storage</strong></p>
          <p class="mb-3">The API stores room and gameplay data, including player names and room names, so other players in the same room can see shared state in real time.</p>
          <p class="mb-2"><strong>Browser local storage</strong></p>
          <p class="mb-3">Your browser stores convenience data under Spektrum keys (for example: player uuid/name, last rooms, room names, background music, and volume).</p>

          <h2 class="h5 mt-4">Why data is used</h2>
          <ul>
            <li>To identify players and show names in rooms.</li>
            <li>To create and list rooms (including room names that may contain player names).</li>
            <li>To synchronize game progress for all players in the same room.</li>
            <li>To remember local preferences and recent history on your device.</li>
          </ul>

          <h2 class="h5 mt-4">How to remove your data</h2>
          <p class="mb-2"><strong>Local (browser) data</strong></p>
          <p class="mb-3">Use browser site-data clearing or reset actions in the app to remove locally cached identifiers, room history, and audio preference settings.</p>
          <p class="mb-2"><strong>Backend room data</strong></p>
          <p class="mb-0">Room/game data is managed by the API. If you want room data removed from the backend, contact the operator of this Spektrum deployment.</p>
        </div>
      </div>
    </div>`;

  root.querySelector("#sp-privacy-back")?.addEventListener("click", () => {
    navigateHome();
  });
}
