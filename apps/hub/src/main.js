import { hubData } from "./hub-data.js";

const byId = (id) => document.getElementById(id);

byId("updated").textContent = `${hubData.release.version} / ${hubData.release.updatedAt}`;

byId("release").innerHTML = `
  <div class="section-head">
    <p class="eyebrow">Release</p>
    <h3>${hubData.release.name}</h3>
  </div>
  <p class="release-copy">${hubData.release.summary}</p>
  <div class="status-line">
    <span>${hubData.release.status}</span>
    <span>local-first runtime</span>
    <span>private hub</span>
  </div>
`;

byId("platforms").innerHTML = `
  <div class="section-head">
    <p class="eyebrow">Platform Matrix</p>
    <h3>Best surface per platform</h3>
  </div>
  <div class="rows">
    ${hubData.platforms
      .map(
        (item) => `
          <article class="row-card">
            <div>
              <strong>${item.lane}</strong>
              <span>${item.next}</span>
            </div>
            <em>${item.state}</em>
            <code>${item.proof}</code>
          </article>
        `
      )
      .join("")}
  </div>
`;

byId("proof").innerHTML = `
  <div class="section-head">
    <p class="eyebrow">Verification Proof</p>
    <h3>Commands that count</h3>
  </div>
  <div class="proof-grid">
    ${hubData.proof
      .map(
        (item) => `
          <article class="proof-card">
            <span>${item.state}</span>
            <strong>${item.label}</strong>
            <code>${item.command}</code>
          </article>
        `
      )
      .join("")}
  </div>
`;

byId("artifacts").innerHTML = `
  <div class="section-head">
    <p class="eyebrow">Artifacts</p>
    <h3>GitHub Releases is the shelf</h3>
  </div>
  <div class="rows">
    ${hubData.artifacts
      .map(
        (item) => `
          <article class="row-card">
            <div>
              <strong>${item.name}</strong>
              <span>${item.source}</span>
            </div>
            <em>${item.state}</em>
            ${item.link ? `<code>${item.link}</code>` : "<code>waiting for remote</code>"}
          </article>
        `
      )
      .join("")}
  </div>
`;

byId("packets").innerHTML = `
  <div class="section-head">
    <p class="eyebrow">Agent Packets</p>
    <h3>One next move per lane</h3>
  </div>
  <div class="packet-grid">
    ${hubData.packets
      .map(
        (item) => `
          <article class="packet">
            <span>${item.lane}</span>
            <strong>${item.packet}</strong>
            <small>${item.owner}</small>
          </article>
        `
      )
      .join("")}
  </div>
`;

byId("caveats").innerHTML = `
  <div class="section-head">
    <p class="eyebrow">Known Caveats</p>
    <h3>Do not re-decide these</h3>
  </div>
  <ul class="caveats">
    ${hubData.caveats.map((item) => `<li>${item}</li>`).join("")}
  </ul>
`;
