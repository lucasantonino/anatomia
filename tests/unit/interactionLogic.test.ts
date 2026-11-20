import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  CAMERA_SETTLE_DELAY_MS,
  HOVER_CLEAR_HYSTERESIS_MS,
  HOVER_SWITCH_HYSTERESIS_MS,
  HoverHysteresisController,
  TAP_MAX_DISTANCE_PX,
  TAP_MAX_DURATION_MS,
  TapGestureClassifier,
  evaluateTapGesture,
  getRaycastEligibleSystems,
} from '../../src/scene/InteractionController';
import {
  CLINICAL_BONE_MATERIAL,
  CLINICAL_MUSCLE_MATERIAL,
  MaterialManager,
} from '../../src/scene/MaterialManager';

describe('getRaycastEligibleSystems (ADR-006 / modo fantasma)', () => {
  it('retorna apenas skeletal quando somente ossos estão visíveis', () => {
    const skeletalOnly = new Set<'muscular' | 'skeletal'>(['skeletal']);
    expect(getRaycastEligibleSystems(skeletalOnly, 1.0)).toEqual(['skeletal']);
    expect(getRaycastEligibleSystems(skeletalOnly, 0.15)).toEqual(['skeletal']);
  });

  it('retorna muscular quando somente músculos estão visíveis, mesmo com muscleOpacity <= 0.25', () => {
    const muscularOnly = new Set<'muscular' | 'skeletal'>(['muscular']);
    expect(getRaycastEligibleSystems(muscularOnly, 1.0)).toEqual(['muscular']);
    expect(getRaycastEligibleSystems(muscularOnly, 0.2)).toEqual(['muscular']);
    expect(getRaycastEligibleSystems(muscularOnly, 0.15)).toEqual(['muscular']);
  });

  it('retorna ambos os sistemas em Ambos quando muscleOpacity > 0.25', () => {
    const both = new Set<'muscular' | 'skeletal'>(['muscular', 'skeletal']);
    expect(getRaycastEligibleSystems(both, 1.0)).toEqual([
      'skeletal',
      'muscular',
    ]);
    expect(getRaycastEligibleSystems(both, 0.3)).toEqual([
      'skeletal',
      'muscular',
    ]);
    expect(getRaycastEligibleSystems(both, 0.251)).toEqual([
      'skeletal',
      'muscular',
    ]);
  });

  it('exclui muscular em Ambos quando muscleOpacity <= 0.25 (seleção direta de ossos)', () => {
    const both = new Set<'muscular' | 'skeletal'>(['muscular', 'skeletal']);
    expect(getRaycastEligibleSystems(both, 0.25)).toEqual(['skeletal']);
    expect(getRaycastEligibleSystems(both, 0.2)).toEqual(['skeletal']);
    expect(getRaycastEligibleSystems(both, 0.15)).toEqual(['skeletal']);
  });
});

describe('HoverHysteresisController (RF-05 anti-tremor e suspensão em órbita)', () => {
  it('usa constantes padrão documentadas (55 ms troca, 70 ms saída, 80 ms respiro de câmera)', () => {
    expect(HOVER_SWITCH_HYSTERESIS_MS).toBe(55);
    expect(HOVER_CLEAR_HYSTERESIS_MS).toBe(70);
    expect(CAMERA_SETTLE_DELAY_MS).toBe(80);
  });

  it('faz entrada imediata a partir do vazio (null -> A)', () => {
    const controller = new HoverHysteresisController();
    const enter = controller.evaluate('muscle.biceps_brachii.left', 100);

    expect(enter).toEqual({
      committedId: 'muscle.biceps_brachii.left',
      changed: true,
      pendingDelayMs: null,
    });
    expect(controller.getCommittedId()).toBe('muscle.biceps_brachii.left');

    const steady = controller.evaluate('muscle.biceps_brachii.left', 120);
    expect(steady).toEqual({
      committedId: 'muscle.biceps_brachii.left',
      changed: false,
      pendingDelayMs: null,
    });
  });

  it('exige estabilidade >= 55 ms na troca entre estruturas adjacentes (A -> B) via evaluate e flush', () => {
    const controller = new HoverHysteresisController();
    controller.evaluate('muscle.deltoideus.left', 1000);

    // t = 1000: inicia contagem de 55 ms
    expect(controller.evaluate('muscle.triceps_brachii.left', 1000)).toEqual({
      committedId: 'muscle.deltoideus.left',
      changed: false,
      pendingDelayMs: 55,
    });

    // t = 1030 (30 ms): ainda mantém A
    expect(controller.evaluate('muscle.triceps_brachii.left', 1030)).toEqual({
      committedId: 'muscle.deltoideus.left',
      changed: false,
      pendingDelayMs: 25,
    });

    // t = 1054 (54 ms): 1 ms restante
    expect(controller.evaluate('muscle.triceps_brachii.left', 1054)).toEqual({
      committedId: 'muscle.deltoideus.left',
      changed: false,
      pendingDelayMs: 1,
    });

    // t = 1055 (55 ms): efetiva troca para B
    expect(controller.evaluate('muscle.triceps_brachii.left', 1055)).toEqual({
      committedId: 'muscle.triceps_brachii.left',
      changed: true,
      pendingDelayMs: null,
    });

    // Troca seguinte concluída via flush()
    expect(controller.evaluate('muscle.brachialis.left', 2000)).toEqual({
      committedId: 'muscle.triceps_brachii.left',
      changed: false,
      pendingDelayMs: 55,
    });
    expect(controller.flush(2054)).toEqual({
      committedId: 'muscle.triceps_brachii.left',
      changed: false,
      pendingDelayMs: 1,
    });
    expect(controller.flush(2055)).toEqual({
      committedId: 'muscle.brachialis.left',
      changed: true,
      pendingDelayMs: null,
    });
  });

  it('evita cintilação quando cursor retorna rapidamente A -> B (20 ms) -> A', () => {
    const controller = new HoverHysteresisController();
    controller.evaluate('muscle.deltoideus.left', 100);

    // Oscila brevemente para B por 20 ms
    const glitch = controller.evaluate('muscle.triceps_brachii.left', 120);
    expect(glitch.changed).toBe(false);
    expect(glitch.committedId).toBe('muscle.deltoideus.left');

    // Retorna para A antes dos 55 ms: cancela pendência
    const backToA = controller.evaluate('muscle.deltoideus.left', 140);
    expect(backToA).toEqual({
      committedId: 'muscle.deltoideus.left',
      changed: false,
      pendingDelayMs: null,
    });

    // flush não deve disparar nada pois a pendência foi cancelada
    expect(controller.flush(250)).toEqual({
      committedId: 'muscle.deltoideus.left',
      changed: false,
      pendingDelayMs: null,
    });

    // Novo contato com B em t = 260 reinicia a contagem de 55 ms do zero
    expect(controller.evaluate('muscle.triceps_brachii.left', 260)).toEqual({
      committedId: 'muscle.deltoideus.left',
      changed: false,
      pendingDelayMs: 55,
    });
    expect(controller.evaluate('muscle.triceps_brachii.left', 300)).toEqual({
      committedId: 'muscle.deltoideus.left',
      changed: false,
      pendingDelayMs: 15,
    });
    expect(controller.evaluate('muscle.triceps_brachii.left', 315)).toEqual({
      committedId: 'muscle.triceps_brachii.left',
      changed: true,
      pendingDelayMs: null,
    });
  });

  it('exige estabilidade >= 70 ms na saída para o vazio (A -> null)', () => {
    const controller = new HoverHysteresisController();
    controller.evaluate('bone.clavicula.right', 500);

    expect(controller.evaluate(null, 520)).toEqual({
      committedId: 'bone.clavicula.right',
      changed: false,
      pendingDelayMs: 70,
    });

    expect(controller.evaluate(null, 589)).toEqual({
      committedId: 'bone.clavicula.right',
      changed: false,
      pendingDelayMs: 1,
    });

    expect(controller.evaluate(null, 590)).toEqual({
      committedId: null,
      changed: true,
      pendingDelayMs: null,
    });
  });

  it('suspende imediatamente em onCameraStart() e respeita 80 ms de respiro após onCameraEnd()', () => {
    const controller = new HoverHysteresisController();
    controller.evaluate('bone.scapula.right', 100);

    const onStart = controller.onCameraStart();
    expect(onStart).toEqual({
      committedId: null,
      changed: true,
      pendingDelayMs: null,
    });
    expect(controller.isSuspended(150)).toBe(true);

    // Novo hover durante rotação é ignorado
    expect(controller.evaluate('bone.scapula.right', 200)).toEqual({
      committedId: null,
      changed: false,
      pendingDelayMs: null,
    });

    // Fim da rotação em t = 300: permanece suspenso até t = 380
    controller.onCameraEnd(300);
    expect(controller.isSuspended(300)).toBe(true);
    expect(controller.isSuspended(379)).toBe(true);
    expect(controller.evaluate('bone.scapula.right', 379)).toEqual({
      committedId: null,
      changed: false,
      pendingDelayMs: null,
    });

    // Em t = 380 (t + 80 ms): retoma e efetiva entrada imediatamente
    expect(controller.isSuspended(380)).toBe(false);
    expect(controller.evaluate('bone.scapula.right', 380)).toEqual({
      committedId: 'bone.scapula.right',
      changed: true,
      pendingDelayMs: null,
    });

    // forceClear limpa imediatamente sem esperar 70 ms
    expect(controller.forceClear()).toEqual({
      committedId: null,
      changed: true,
      pendingDelayMs: null,
    });
    expect(controller.forceClear().changed).toBe(false);
  });
});

describe('evaluateTapGesture e TapGestureClassifier (RF-06 Tap vs. Drag / Pinça)', () => {
  it('usa limiares documentados (<= 8 px e < 350 ms)', () => {
    expect(TAP_MAX_DISTANCE_PX).toBe(8);
    expect(TAP_MAX_DURATION_MS).toBe(350);
  });

  it('evaluateTapGesture valida distância euclidiana, duração e contagem de ponteiros', () => {
    // Toque simples válido exatamente na fronteira de 8 px e 349 ms
    expect(
      evaluateTapGesture({
        startX: 100,
        startY: 100,
        endX: 108,
        endY: 100,
        durationMs: 349,
        maxActivePointers: 1,
      }),
    ).toBe(true);

    // Deslocamento diagonal dentro de 8 px (hypot(6, 5) = 7.81 px)
    expect(
      evaluateTapGesture({
        startX: 100,
        startY: 100,
        endX: 106,
        endY: 105,
        durationMs: 120,
        maxActivePointers: 1,
      }),
    ).toBe(true);

    // Deslocamento diagonal acima de 8 px (hypot(6, 6) = 8.49 px)
    expect(
      evaluateTapGesture({
        startX: 100,
        startY: 100,
        endX: 106,
        endY: 106,
        durationMs: 120,
        maxActivePointers: 1,
      }),
    ).toBe(false);

    // Duração igual ou maior que 350 ms -> falso
    expect(
      evaluateTapGesture({
        startX: 100,
        startY: 100,
        endX: 100,
        endY: 100,
        durationMs: 350,
        maxActivePointers: 1,
      }),
    ).toBe(false);

    // Duração negativa ou não finita -> falso
    expect(
      evaluateTapGesture({
        startX: 100,
        startY: 100,
        endX: 100,
        endY: 100,
        durationMs: -1,
        maxActivePointers: 1,
      }),
    ).toBe(false);
    expect(
      evaluateTapGesture({
        startX: 100,
        startY: 100,
        endX: 100,
        endY: 100,
        durationMs: Number.NaN,
        maxActivePointers: 1,
      }),
    ).toBe(false);

    // Multi-toque ou limiar de movimento excedido durante trajeto -> falso
    expect(
      evaluateTapGesture({
        startX: 100,
        startY: 100,
        endX: 100,
        endY: 100,
        durationMs: 100,
        maxActivePointers: 2,
      }),
    ).toBe(false);
    expect(
      evaluateTapGesture({
        startX: 100,
        startY: 100,
        endX: 100,
        endY: 100,
        durationMs: 100,
        maxActivePointers: 1,
        exceededMoveThreshold: true,
      }),
    ).toBe(false);
  });

  it('TapGestureClassifier reconhece toque simples válido e rejeita toque longo >= 350 ms', () => {
    const classifier = new TapGestureClassifier();

    classifier.onPointerDown(1, 200, 300, 1000);
    classifier.onPointerMove(1, 204, 303); // distância 5 px
    expect(classifier.onPointerUp(1, 204, 303, 1250)).toBe(true);
    expect(classifier.getActivePointerCount()).toBe(0);

    // Toque longo (exatamente 350 ms)
    classifier.onPointerDown(2, 200, 300, 2000);
    expect(classifier.onPointerUp(2, 200, 300, 2350)).toBe(false);
  });

  it('TapGestureClassifier rejeita arrasto > 8 px mesmo retornando ao ponto inicial antes do pointerup', () => {
    const classifier = new TapGestureClassifier();

    classifier.onPointerDown(1, 100, 100, 1000);
    classifier.onPointerMove(1, 115, 100); // 15 px > 8 px: invalida gesto
    classifier.onPointerMove(1, 100, 100); // retorna exatamente à origem
    expect(classifier.onPointerUp(1, 100, 100, 1120)).toBe(false);

    // Próximo toque limpo volta a ser aceito
    classifier.onPointerDown(2, 100, 100, 1500);
    expect(classifier.onPointerUp(2, 101, 101, 1600)).toBe(true);
  });

  it('TapGestureClassifier rejeita pinça/multi-toque e recupera após todos os dedos soltarem', () => {
    const classifier = new TapGestureClassifier();

    // Dedo 1 e dedo 2 simultâneos; dedo 2 solta primeiro, depois dedo 1 no ponto exato inicial
    classifier.onPointerDown(1, 100, 100, 1000);
    classifier.onPointerDown(2, 220, 220, 1030);
    expect(classifier.getActivePointerCount()).toBe(2);

    expect(classifier.onPointerUp(2, 220, 220, 1080)).toBe(false);
    expect(classifier.getActivePointerCount()).toBe(1);
    expect(classifier.onPointerUp(1, 100, 100, 1100)).toBe(false);
    expect(classifier.getActivePointerCount()).toBe(0);

    // Ordem inversa: dedo 1 solta primeiro, depois dedo 2
    classifier.onPointerDown(3, 100, 100, 2000);
    classifier.onPointerDown(4, 220, 220, 2020);
    expect(classifier.onPointerUp(3, 100, 100, 2060)).toBe(false);
    expect(classifier.onPointerUp(4, 220, 220, 2090)).toBe(false);
    expect(classifier.getActivePointerCount()).toBe(0);

    // Próximo toque simples após soltar todos os dedos funciona normalmente
    classifier.onPointerDown(5, 150, 150, 3000);
    expect(classifier.onPointerUp(5, 152, 151, 3120)).toBe(true);
  });

  it('TapGestureClassifier invalida toque atual em onPointerCancel e recupera estado limpo', () => {
    const classifier = new TapGestureClassifier();

    classifier.onPointerDown(1, 100, 100, 1000);
    classifier.onPointerCancel(1);
    expect(classifier.getActivePointerCount()).toBe(0);
    expect(classifier.onPointerUp(1, 100, 100, 1050)).toBe(false);

    // Cancelamento durante multi-toque também impede falso tap do dedo remanescente
    classifier.onPointerDown(2, 100, 100, 2000);
    classifier.onPointerDown(3, 180, 180, 2010);
    classifier.onPointerCancel(3);
    expect(classifier.onPointerUp(2, 100, 100, 2080)).toBe(false);
    expect(classifier.getActivePointerCount()).toBe(0);

    // Próximo toque simples retorna true
    classifier.onPointerDown(4, 80, 90, 3000);
    expect(classifier.onPointerUp(4, 80, 90, 3100)).toBe(true);
  });
});

describe('MaterialManager (reversibilidade, multi-malha e opacidade muscular em Node)', () => {
  function createMesh(name: string): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial(),
    );
    mesh.name = name;
    return mesh;
  }

  it('garante realce 100% reversível (default -> hovered -> selected -> default) sincronizado entre múltiplas cabeças do mesmo anatomyId', () => {
    const manager = new MaterialManager();

    const bicepsShortHead = createMesh('muscle.biceps_brachii.left.short_head');
    const bicepsLongHead = createMesh('muscle.biceps_brachii.left.long_head');
    const deltoidAcromial = createMesh('muscle.deltoideus.left.acromial');
    const claviculaRight = createMesh('bone.clavicula.right');

    manager.registerSystemMeshes(
      'skeletal',
      new Map([['bone.clavicula.right', [claviculaRight]]]),
    );
    manager.registerSystemMeshes(
      'muscular',
      new Map([
        ['muscle.biceps_brachii.left', [bicepsShortHead, bicepsLongHead]],
        ['muscle.deltoideus.left', [deltoidAcromial]],
      ]),
    );

    // Ambas as cabeças do bíceps compartilham o mesmo MeshStandardMaterial gerenciado
    expect(bicepsShortHead.material).toBe(bicepsLongHead.material);
    expect(bicepsShortHead.material).not.toBe(deltoidAcromial.material);

    const bicepsMat = bicepsShortHead.material as THREE.MeshStandardMaterial;
    const deltoidMat = deltoidAcromial.material as THREE.MeshStandardMaterial;
    const boneMat = claviculaRight.material as THREE.MeshStandardMaterial;

    const baseMuscleHex = bicepsMat.color.getHex();
    const baseBoneHex = boneMat.color.getHex();
    expect(baseMuscleHex).toBe(CLINICAL_MUSCLE_MATERIAL.colorHex);
    expect(baseBoneHex).toBe(CLINICAL_BONE_MATERIAL.colorHex);

    // Estado hovered no bíceps
    manager.syncHighlights('muscle.biceps_brachii.left', null);
    expect(bicepsMat.emissive.getHex()).toBe(
      CLINICAL_MUSCLE_MATERIAL.highlightEmissiveHex,
    );
    expect(bicepsMat.emissiveIntensity).toBe(
      CLINICAL_MUSCLE_MATERIAL.hoverEmissiveIntensity,
    );
    expect(deltoidMat.emissiveIntensity).toBe(0);

    // Estado selected no bíceps + hovered no osso simultaneamente
    manager.syncHighlights('bone.clavicula.right', 'muscle.biceps_brachii.left');
    expect(bicepsMat.emissiveIntensity).toBe(
      CLINICAL_MUSCLE_MATERIAL.selectedEmissiveIntensity,
    );
    expect(boneMat.emissive.getHex()).toBe(
      CLINICAL_BONE_MATERIAL.highlightEmissiveHex,
    );
    expect(boneMat.emissiveIntensity).toBe(
      CLINICAL_BONE_MATERIAL.hoverEmissiveIntensity,
    );

    // Retorno a default: 100% reversível
    manager.syncHighlights(null, null);
    expect(bicepsMat.color.getHex()).toBe(baseMuscleHex);
    expect(bicepsMat.emissive.getHex()).toBe(0x000000);
    expect(bicepsMat.emissiveIntensity).toBe(0);
    expect(bicepsMat.roughness).toBe(CLINICAL_MUSCLE_MATERIAL.roughness);
    expect(bicepsMat.metalness).toBe(CLINICAL_MUSCLE_MATERIAL.metalness);

    expect(boneMat.color.getHex()).toBe(baseBoneHex);
    expect(boneMat.emissive.getHex()).toBe(0x000000);
    expect(boneMat.emissiveIntensity).toBe(0);
    expect(boneMat.roughness).toBe(CLINICAL_BONE_MATERIAL.roughness);
    expect(boneMat.metalness).toBe(CLINICAL_BONE_MATERIAL.metalness);

    manager.dispose();
  });

  it('alterna opaco <-> translúcido nos músculos somente no modo Ambos e mantém sólido em Músculos isolado', () => {
    const manager = new MaterialManager();
    const boneMesh = createMesh('bone.humerus.right');
    const muscleMesh = createMesh('muscle.brachialis.right');

    manager.registerSystemMeshes(
      'skeletal',
      new Map([['bone.humerus.right', [boneMesh]]]),
    );
    manager.registerSystemMeshes(
      'muscular',
      new Map([['muscle.brachialis.right', [muscleMesh]]]),
    );

    const boneMat = boneMesh.material as THREE.MeshStandardMaterial;
    const muscleMat = muscleMesh.material as THREE.MeshStandardMaterial;
    const both = new Set<'muscular' | 'skeletal'>(['muscular', 'skeletal']);
    const muscularOnly = new Set<'muscular' | 'skeletal'>(['muscular']);

    // Ambos + opacidade 1.0 -> opaco (evita artefatos de depth sorting)
    manager.applyLayerAppearance(both, 1.0);
    expect(muscleMat.transparent).toBe(false);
    expect(muscleMat.depthWrite).toBe(true);
    expect(muscleMat.opacity).toBe(1);
    expect(muscleMesh.renderOrder).toBe(1);
    expect(boneMesh.renderOrder).toBe(1);

    // Ambos + opacidade 0.6 -> músculos translúcidos, renderOrder 2 vs ossos renderOrder 1
    manager.applyLayerAppearance(both, 0.6);
    expect(muscleMat.transparent).toBe(true);
    expect(muscleMat.depthWrite).toBe(false);
    expect(muscleMat.opacity).toBe(0.6);
    expect(muscleMesh.renderOrder).toBe(2);
    expect(boneMat.transparent).toBe(false);
    expect(boneMat.depthWrite).toBe(true);
    expect(boneMesh.renderOrder).toBe(1);

    // Somente músculos + muscleOpacity 0.2 -> permanece sólido/opaco!
    manager.applyLayerAppearance(muscularOnly, 0.2);
    expect(muscleMat.transparent).toBe(false);
    expect(muscleMat.depthWrite).toBe(true);
    expect(muscleMat.opacity).toBe(1);
    expect(muscleMesh.renderOrder).toBe(1);

    // Volta para Ambos + 0.2 -> reassume modo translúcido
    manager.applyLayerAppearance(both, 0.2);
    expect(muscleMat.transparent).toBe(true);
    expect(muscleMat.depthWrite).toBe(false);
    expect(muscleMat.opacity).toBe(0.2);
    expect(muscleMesh.renderOrder).toBe(2);

    manager.dispose();
  });
});
