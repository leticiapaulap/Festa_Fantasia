export function ScenePhotograph() {
  return (
    <div className="scene-depth-plane scene-depth-photo" data-scene-layer="photograph">
      <picture className="scene-picture">
        <source type="image/webp" srcSet="/assets/halloween-invitation-background.webp" />
        <img className="scene-photo" src="/assets/halloween-invitation-background.png" width="1672" height="941" alt="" fetchPriority="high" decoding="async" draggable={false} />
      </picture>
    </div>
  );
}
