import { useEffect, useRef } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkConeSource from '@kitware/vtk.js/Filters/Sources/ConeSource';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';

interface VtkContext {
  fullScreenRenderer: ReturnType<typeof vtkFullScreenRenderWindow.newInstance>;
  renderWindow: ReturnType<ReturnType<typeof vtkFullScreenRenderWindow.newInstance>['getRenderWindow']>;
  renderer: ReturnType<ReturnType<typeof vtkFullScreenRenderWindow.newInstance>['getRenderer']>;
  coneSource: ReturnType<typeof vtkConeSource.newInstance>;
  actor: ReturnType<typeof vtkActor.newInstance>;
  mapper: ReturnType<typeof vtkMapper.newInstance>;
}

function Vtk() {
  const vtkContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<VtkContext | null>(null);

  useEffect(() => {
    if (!context.current) {
      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        container: vtkContainerRef.current!,
      });
      const coneSource = vtkConeSource.newInstance({ height: 1.0 });

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(coneSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);

      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();

      renderer.addActor(actor);
      renderer.resetCamera();
      renderWindow.render();

      context.current = {
        fullScreenRenderer,
        renderWindow,
        renderer,
        coneSource,
        actor,
        mapper,
      };
    }

    return () => {
      if (context.current) {
        const { fullScreenRenderer, coneSource, actor, mapper } = context.current;
        actor.delete();
        mapper.delete();
        coneSource.delete();
        fullScreenRenderer.delete();
        context.current = null;
      }
    };
  }, []);

  return (
    <div>
      <div ref={vtkContainerRef} />
    </div>
  );
}

export default Vtk;
