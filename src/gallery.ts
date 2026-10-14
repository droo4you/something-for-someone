// Debug: ?gallery renders every sprite for visual QA.
import { heroFrames, enemyFrames, staticSprite } from './ui/spritecache';
import { ENEMY_SPRITES } from './ui/characters';
export function gallery(app: HTMLElement) {
  app.innerHTML = '<div id="g" style="display:flex;flex-wrap:wrap;gap:10px;padding:10px;background:#7aa88a;align-items:flex-end"></div>';
  const g = app.querySelector('#g')!;
  const add = (c: HTMLCanvasElement, label: string) => { const d = document.createElement('div'); d.style.cssText = 'text-align:center;font-size:7px;color:#000'; d.appendChild(c); d.appendChild(document.createElement('br')); d.append(label); g.appendChild(d); };
  for (const h of ['ember', 'tide', 'gale', 'stone']) for (const e of [0, 1, 2]) add(staticSprite(heroFrames(h, e), 3), `${h}${e}`);
  for (const id of Object.keys(ENEMY_SPRITES)) { add(staticSprite(enemyFrames(id), 2), id); if (id.startsWith('boss')) add(staticSprite(enemyFrames(id, 2), 2), id + ' p2'); }
}
