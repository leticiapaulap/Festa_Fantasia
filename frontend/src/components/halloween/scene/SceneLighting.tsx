export function SceneLighting() {
  return (
    <>
      <div className="scene-depth-plane scene-depth-sky" data-scene-layer="sky-light">
        <span className="ambient-light ambient-violet" />
        <span className="scene-light-rays" />
      </div>
      <div className="scene-depth-plane scene-depth-rim" data-scene-layer="ground-light">
        <span className="ambient-light ambient-amber" />
        <span className="scene-ground-reflection" />
      </div>
    </>
  );
}
