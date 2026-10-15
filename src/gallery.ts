// Debug: ?gallery renders every sprite for visual QA.
import { heroFrames, enemyFrames, staticSprite } from './ui/spritecache';
import { ENEMY_SPRITES } from './ui/characters';
export function gallery(app: HTMLElement) {
  app.innerHTML = '<div id="g" style="display:flex;flex-wrap:wrap;gap:10px;padding:10px;background:#1a1440;align-items:flex-end"></div>';
  const g = app.querySelector('#g')!;
  const add = (c: HTMLCanvasElement, label: string) => { const d = document.createElement('div'); d.style.cssText = 'text-align:center;font-size:7px;color:#fff'; d.appendChild(c); d.appendChild(document.createElement('br')); d.append(label); g.appendChild(d); };
  for (const h of ['bass', 'flow', 'tempo', 'wall']) for (const e of [0, 1, 2]) add(staticSprite(heroFrames(h, e), 3), `${h}${e}`);
  const ex = (c: HTMLCanvasElement | undefined, l: string) => { if (!c) return; const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; k.getContext('2d')!.drawImage(c, 0, 0); k.className = 'px'; k.style.width = c.width * 2 + 'px'; add(k, l); };
  for (const h of ['bass', 'flow', 'tempo', 'wall']) { const f = heroFrames(h, 0); ex(f.shout, h + ' shout'); ex(f.hurt, h + ' hurt'); }
  for (const id of Object.keys(ENEMY_SPRITES)) { add(staticSprite(enemyFrames(id), 2), id); if (id.startsWith('boss')) add(staticSprite(enemyFrames(id, 2), 2), id + ' p2'); }
}
