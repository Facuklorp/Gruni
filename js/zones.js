// js/zones.js
import { MAP_DATA as PRADERA_MAP_DATA } from './map_data.js';

export const ZONES = {
    pradera: {
        id: 'pradera', name: 'Pradera', width: 84, height: 104,
        background: 'fondo_gruni', defaultBiome: 'GRASS',
        mapData: PRADERA_MAP_DATA,
        connections: { east: 'bosque_rio', south: 'desierto', west: 'aldea_campo', north: 'montanas_nevadas' }
    },
    desierto: {
        id: 'desierto', name: 'Desierto', width: 60, height: 60,
        background: 'bg_arena', defaultBiome: 'DESERT',
        mapData: null, connections: { north: 'pradera' }
    },
    bosque_rio: {
        id: 'bosque_rio', name: 'Bosque y Río', width: 70, height: 70,
        background: 'bg_pasto', defaultBiome: 'GRASS',
        mapData: null, connections: { west: 'pradera', north: 'bosque_magico' }
    },
    montanas_nevadas: {
        id: 'montanas_nevadas', name: 'Montañas Nevadas', width: 60, height: 60,
        background: 'bg_pasto', defaultBiome: 'SNOW', // TODO: Reemplazar por fondo de nieve
        mapData: null, connections: { south: 'pradera', north: 'zonas_hielo' }
    },
    zonas_hielo: {
        id: 'zonas_hielo', name: 'Zonas de Hielo', width: 50, height: 50,
        background: 'bg_pasto', defaultBiome: 'SNOW', // TODO: Reemplazar por fondo de nieve
        mapData: null, connections: { south: 'montanas_nevadas' }
    },
    bosque_magico: {
        id: 'bosque_magico', name: 'Bosque Mágico', width: 60, height: 60,
        background: 'bg_pasto', defaultBiome: 'PINE',
        mapData: null, connections: { south: 'bosque_rio', east: 'cementerio_animales' }
    },
    aldea_campo: {
        id: 'aldea_campo', name: 'Aldea y Campo', width: 80, height: 80,
        background: 'bg_pasto', defaultBiome: 'GRASS',
        mapData: null, connections: { east: 'pradera', south: 'playa' }
    },
    playa: {
        id: 'playa', name: 'Playa', width: 90, height: 50,
        background: 'bg_agua', defaultBiome: 'WATER_BIOME',
        mapData: null, connections: { north: 'aldea_campo' }
    },
    cementerio_animales: {
        id: 'cementerio_animales', name: 'Cementerio de Animales', width: 50, height: 50,
        background: 'bg_arena', defaultBiome: 'DESERT',
        mapData: null, connections: { west: 'bosque_magico' }
    }
};
