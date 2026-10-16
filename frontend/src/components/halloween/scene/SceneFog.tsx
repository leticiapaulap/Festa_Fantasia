export function SceneFog() {
  return (
    <>
      <div className="scene-depth-plane scene-depth-haze" data-scene-layer="distant-haze"><span className="scene-fog fog-far" /></div>
      <div className="scene-depth-plane scene-depth-ground" data-scene-layer="ground-fog"><span className="scene-fog fog-mid" /></div>
      <div className="scene-depth-plane scene-depth-foreground" data-scene-layer="foreground-fog"><span className="scene-fog fog-near" /></div>
    </>
  );
}
