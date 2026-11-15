import React from 'react';
import {SceneProps} from './common';
import {S1} from './S1';
import {S2} from './S2';
import {S3} from './S3';
import {S4} from './S4';
import {S5} from './S5';
import {S6} from './S6';

export const SCENE_COMPONENTS: Record<number, React.FC<SceneProps>> = {1: S1, 2: S2, 3: S3, 4: S4, 5: S5, 6: S6};

/** Transición con la que ENTRA cada escena (y con la que sale la anterior). */
export type Trans = 'smear' | 'wipe' | 'zoom';
export const TRANSITIONS: Record<number, Trans> = {2: 'smear', 3: 'wipe', 4: 'zoom', 5: 'smear', 6: 'zoom'};
