import type { CSSProperties } from 'react';

const particleLayers = [
  { depth: 'far', particles: [[13, 57, 0, 31], [29, 70, -11, 36], [42, 39, -23, 41], [21, 82, -7, 34]] },
  { depth: 'middle', particles: [[8, 72, -3, 24], [37, 86, -17, 29], [27, 49, -8, 32], [46, 68, -21, 27]] },
  { depth: 'near', particles: [[16, 89, -9, 23], [41, 78, -19, 28]] },
];

export function SceneParticles() {
  return (
    <div className="scene-particles">
      {particleLayers.map(({ depth, particles }) => (
        <div className={`scene-depth-plane scene-motes-${depth}`} data-scene-layer={`particles-${depth}`} key={depth}>
          {particles.map(([horizontal, vertical, delay, duration], index) => (
            <span className="scene-ember" key={index} style={{ '--mote-left': `${horizontal}%`, '--mote-top': `${vertical}%`, '--mote-delay': `${delay}s`, '--mote-duration': `${duration}s` } as CSSProperties}><span /></span>
          ))}
        </div>
      ))}
    </div>
  );
}
