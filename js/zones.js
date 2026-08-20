// js/zones.js
import { MAP_DATA as PRADERA_MAP_DATA } from './map_data.js';

export const ZONES = {
    pradera: {
        id: 'pradera', name: 'Pradera', width: 84, height: 104,
        background: 'fondo_gruni', defaultBiome: 'GRASS',
        mapData: PRADERA_MAP_DATA,
        connections: { north: 'montanas_nevadas', south: 'desierto', east: 'bosque_rio', west: 'aldea_campo' }
    },
    desierto: {
        id: 'desierto', name: 'Desierto', width: 60, height: 60,
        background: 'fondo_desierto', defaultBiome: 'DESERT',
        mapData: null, connections: { north: 'pradera', east: 'cementerio_animales', west: 'playa' }
    },
    bosque_rio: {
        id: 'bosque_rio', name: 'Bosque y Río', width: 70, height: 70,
        background: 'bg_pasto', defaultBiome: 'GRASS',
        mapData: null, connections: { west: 'pradera', north: 'bosque_magico', south: 'cementerio_animales' }
    },
    montanas_nevadas: {
        id: 'montanas_nevadas', name: 'Montañas Nevadas', width: 60, height: 60,
        background: 'bg_pasto', defaultBiome: 'SNOW',
        mapData: null, connections: { south: 'pradera', east: 'bosque_magico', west: 'zonas_hielo' }
    },
    zonas_hielo: {
        id: 'zonas_hielo', name: 'Zonas de Hielo', width: 50, height: 50,
        background: 'bg_pasto', defaultBiome: 'SNOW',
        mapData: null, connections: { east: 'montanas_nevadas', south: 'aldea_campo' }
    },
    bosque_magico: {
        id: 'bosque_magico', name: 'Bosque Mágico', width: 60, height: 60,
        background: 'bg_pasto', defaultBiome: 'PINE',
        mapData: null, connections: { south: 'bosque_rio', west: 'montanas_nevadas' }
    },
    aldea_campo: {
        id: 'aldea_campo', name: 'Aldea y Campo', width: 80, height: 80,
        background: 'bg_pasto', defaultBiome: 'GRASS',
        mapData: null, connections: { east: 'pradera', south: 'playa', north: 'zonas_hielo' }
    },
    playa: {
        id: 'playa', name: 'Playa', width: 90, height: 50,
        background: 'bg_agua', defaultBiome: 'WATER_BIOME',
        mapData: null, connections: { north: 'aldea_campo', east: 'desierto' }
    },
    cementerio_animales: {
        id: 'cementerio_animales', name: 'Cementerio de Animales', width: 50, height: 50,
        background: 'bg_arena', defaultBiome: 'DESERT',
        mapData: null, connections: { north: 'bosque_rio', west: 'desierto' }
    }
};
