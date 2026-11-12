// js/main.js
import { World, CELL_SIZE, RESOURCES, ISO_W, ISO_H, ZOOM } from './world.js?v=20261111pers';
import { Agent, STATES } from './agent.js?v=20261111pers';
import { Renderer } from './renderer.js?v=20261111pers';
import { ParticleSystem } from './particles.js?v=20261108a';
import { Wolf } from './wolf.js?v=20261108a';
import { Enemy } from './enemy.js?v=20261108a';

const canvas = document.getElementById('gameCanvas');

export const IMAGES = {};
const imageUrls = {
    wakfu_grass: 'assets/wakfu_grass.png',
    wakfu_dirt: 'assets/wakfu_dirt.png',
    wakfu_water: 'assets/wakfu_water.png',
    wakfu_pasto_solo_1: 'Biomas/PASTO/pasto solo.png',
    wakfu_pasto_solo_2: 'Biomas/PASTO/pasto solo 2.png',
    wakfu_pasto_solo_3: 'Biomas/PASTO/pasto solo 3.png',
    wakfu_pasto_solo_4: 'Biomas/PASTO/pasto solo 4.png',
    // ── Tiles de bioma: PASTO (4 variantes) ───────────────────
    pasto_iso_1: 'Biomas/Tiles/pastoA2.png',
    pasto_iso_2: 'Biomas/Tiles/pastoA3.png',
    pasto_iso_3: 'Biomas/Tiles/pastoA2.png',
    pasto_iso_4: 'Biomas/Tiles/pastoA3.png',
    pasto_iso_5: 'Biomas/Tiles/pastoF.png',
    // ── Tiles de bioma: DESIERTO (4 variantes) ────────────────────────
    desierto_iso_1: 'Biomas/Tiles/Ds1.png',
    desierto_iso_2: 'Biomas/Tiles/Ds1.png',
    desierto_iso_3: 'Biomas/Tiles/Ds1.png',
    desierto_iso_4: 'Biomas/Tiles/Ds2.png',
    // ── Tiles de bioma: AGUA (3 frames de animación) ─────────────
    agua_bioma_iso_1: 'Biomas/Tiles/agua.png',
    agua_bioma_iso_2: 'Biomas/Tiles/agua.png',
    agua_bioma_iso_3: 'Biomas/Tiles/agua.png',
    // ── Tiles de bioma: PANTANO (3 variantes) ────────────────────────
    pantano_iso_1: 'Biomas/Tiles/pantano.png',
    pantano_iso_2: 'Biomas/Tiles/pantano.png',
    pantano_iso_3: 'Biomas/Tiles/pantano.png',
    sprout_grass: 'assets/sprout_grass_pastel.png',
    sprout_water: 'assets/sprout_water.png',
    agua_autotile: 'Vegetación/Agua_Autotile_pastel.png',
    agua_arena_autotile: 'Vegetación/Agua_Arena_Autotile_pastel.png',
    arena_autotile: 'Vegetación/Arena_Autotile_pastel.png',
    sprout_house: 'assets/sprout_house.png',
    sprout_roof: 'assets/sprout_roof.png',
    sprout_objects: 'assets/sprout_objects_pastel.png',
    sprout_bridge: 'assets/sprout_bridge.png',
    sprout_agent: 'assets/sprout_agent.png',
    sprout_agent_actions: 'assets/sprout_agent_actions.png',
    sprout_tools: 'assets/sprout_tools.png',
    sprout_cow: 'assets/sprout_cow.png',
    sprout_chicken: 'assets/sprout_chicken.png',
    agent_action_chop: 'assets/sprites/gruni/gruni_talar.png?v=20261111grunidefault',
    agent_action_mine: 'assets/sprites/gruni/gruni_picar.png?v=20261111grunidefault',
    agent_action_build: 'assets/sprites/gruni/gruni_construir.png?v=20261111grunidefault',
    agent_action_attack: 'assets/sprites/gruni/gruni_atacar.png?v=20261111grunidefault',
    agent_walk_side_1: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_01.png',
    agent_walk_side_2: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_02.png',
    agent_walk_side_3: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_03.png',
    agent_walk_side_4: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_04.png',
    agent_walk_side_5: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_05.png',
    agent_walk_side_6: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_06.png',
    agent_walk_side_7: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_07.png',
    agent_walk_side_8: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_08.png',
    agent_walk_side_9: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_09.png',
    agent_walk_side_10: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_10.png',
    agent_walk_side_11: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_11.png',
    agent_walk_side_12: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_12.png',
    agent_walk_side_13: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_13.png',
    agent_walk_side_14: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_14.png',
    agent_walk_side_15: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_15.png',
    agent_walk_side_16: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_16.png',
    agent_walk_side_17: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_17.png',
    agent_walk_side_18: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_18.png',
    agent_walk_side_19: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_19.png',
    agent_walk_side_20: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_20.png',
    agent_walk_side_21: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_21.png',
    agent_walk_side_22: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_22.png',
    agent_walk_side_23: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_23.png',
    agent_walk_side_24: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_24.png',
    agent_walk_side_25: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_25.png',
    agent_walk_side_26: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_26.png',
    agent_walk_side_27: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_27.png',
    agent_walk_side_28: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_28.png',
    agent_walk_side_29: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_29.png',
    agent_walk_side_30: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_30.png',
    agent_walk_side_31: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_31.png',
    agent_walk_side_32: 'Gruni Sprites/Caminata_Derecha_Fluida_Rapida/Gruni_caminando_derecha_fluido_32.png',
    agent_walk_left_1: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_01.png',
    agent_walk_left_2: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_02.png',
    agent_walk_left_3: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_03.png',
    agent_walk_left_4: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_04.png',
    agent_walk_left_5: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_05.png',
    agent_walk_left_6: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_06.png',
    agent_walk_left_7: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_07.png',
    agent_walk_left_8: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_08.png',
    agent_walk_left_9: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_09.png',
    agent_walk_left_10: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_10.png',
    agent_walk_left_11: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_11.png',
    agent_walk_left_12: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_12.png',
    agent_walk_left_13: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_13.png',
    agent_walk_left_14: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_14.png',
    agent_walk_left_15: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_15.png',
    agent_walk_left_16: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_16.png',
    agent_walk_left_17: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_17.png',
    agent_walk_left_18: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_18.png',
    agent_walk_left_19: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_19.png',
    agent_walk_left_20: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_20.png',
    agent_walk_left_21: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_21.png',
    agent_walk_left_22: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_22.png',
    agent_walk_left_23: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_23.png',
    agent_walk_left_24: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_24.png',
    agent_walk_left_25: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_25.png',
    agent_walk_left_26: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_26.png',
    agent_walk_left_27: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_27.png',
    agent_walk_left_28: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_28.png',
    agent_walk_left_29: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_29.png',
    agent_walk_left_30: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_30.png',
    agent_walk_left_31: 'Gruni Sprites/Caminata_Izquierda_Fluida_Rapida/Gruni_caminando_izquierda_fluido_31.png',
    agent_walk_front_1: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_01.png',
    agent_walk_front_2: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_02.png',
    agent_walk_front_3: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_03.png',
    agent_walk_front_4: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_04.png',
    agent_walk_front_5: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_05.png',
    agent_walk_front_6: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_06.png',
    agent_walk_front_7: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_07.png',
    agent_walk_front_8: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_08.png',
    agent_walk_front_9: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_09.png',
    agent_walk_front_10: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_10.png',
    agent_walk_front_11: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_11.png',
    agent_walk_front_12: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_12.png',
    agent_walk_front_13: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_13.png',
    agent_walk_front_14: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_14.png',
    agent_walk_front_15: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_15.png',
    agent_walk_front_16: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_16.png',
    agent_walk_front_17: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_17.png',
    agent_walk_front_18: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_18.png',
    agent_walk_front_19: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_19.png',
    agent_walk_front_20: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_20.png',
    agent_walk_front_21: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_21.png',
    agent_walk_front_22: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_22.png',
    agent_walk_front_23: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_23.png',
    agent_walk_front_24: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_24.png',
    agent_walk_front_25: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_25.png',
    agent_walk_front_26: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_26.png',
    agent_walk_front_27: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_27.png',
    agent_walk_front_28: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_28.png',
    agent_walk_front_29: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_29.png',
    agent_walk_front_30: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_30.png',
    agent_walk_front_31: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_31.png',
    agent_walk_front_32: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_32.png',
    agent_walk_front_33: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_33.png',
    agent_walk_front_34: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_34.png',
    agent_walk_front_35: 'Gruni Sprites/Caminata_Adelante_Fluida_Rapida/Gruni_caminando_fluido_35.png',
    agent_walk_back_1: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_01.png',
    agent_walk_back_2: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_02.png',
    agent_walk_back_3: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_03.png',
    agent_walk_back_4: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_04.png',
    agent_walk_back_5: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_05.png',
    agent_walk_back_6: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_06.png',
    agent_walk_back_7: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_07.png',
    agent_walk_back_8: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_08.png',
    agent_walk_back_9: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_09.png',
    agent_walk_back_10: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_10.png',
    agent_walk_back_11: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_11.png',
    agent_walk_back_12: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_12.png',
    agent_walk_back_13: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_13.png',
    agent_walk_back_14: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_14.png',
    agent_walk_back_15: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_15.png',
    agent_walk_back_16: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_16.png',
    agent_walk_back_17: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_17.png',
    agent_walk_back_18: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_18.png',
    agent_walk_back_19: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_19.png',
    agent_walk_back_20: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_20.png',
    agent_walk_back_21: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_21.png',
    agent_walk_back_22: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_22.png',
    agent_walk_back_23: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_23.png',
    agent_walk_back_24: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_24.png',
    agent_walk_back_25: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_25.png',
    agent_walk_back_26: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_26.png',
    agent_walk_back_27: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_27.png',
    agent_walk_back_28: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_28.png',
    agent_walk_back_29: 'Gruni Sprites/Caminata_Atras_Fluida_Rapida/Gruni_caminando_atras_fluido_29.png',

    // ── Caminatas Diagonales 3/4 de Gruni (SE, SW, NE, NW) ─────
    agent_walk_diag_se_1: 'Gruni Sprites/Caminata_Diagonal_SE/gruni_diagonal_se_01.png?v=20261112diagorange',
    agent_walk_diag_se_2: 'Gruni Sprites/Caminata_Diagonal_SE/gruni_diagonal_se_02.png?v=20261112diagorange',
    agent_walk_diag_se_3: 'Gruni Sprites/Caminata_Diagonal_SE/gruni_diagonal_se_03.png?v=20261112diagorange',
    agent_walk_diag_se_4: 'Gruni Sprites/Caminata_Diagonal_SE/gruni_diagonal_se_04.png?v=20261112diagorange',
    agent_walk_diag_se_5: 'Gruni Sprites/Caminata_Diagonal_SE/gruni_diagonal_se_05.png?v=20261112diagorange',
    agent_walk_diag_se_6: 'Gruni Sprites/Caminata_Diagonal_SE/gruni_diagonal_se_06.png?v=20261112diagorange',

    agent_walk_diag_sw_1: 'Gruni Sprites/Caminata_Diagonal_SW/gruni_diagonal_sw_01.png?v=20261112diagorange',
    agent_walk_diag_sw_2: 'Gruni Sprites/Caminata_Diagonal_SW/gruni_diagonal_sw_02.png?v=20261112diagorange',
    agent_walk_diag_sw_3: 'Gruni Sprites/Caminata_Diagonal_SW/gruni_diagonal_sw_03.png?v=20261112diagorange',
    agent_walk_diag_sw_4: 'Gruni Sprites/Caminata_Diagonal_SW/gruni_diagonal_sw_04.png?v=20261112diagorange',
    agent_walk_diag_sw_5: 'Gruni Sprites/Caminata_Diagonal_SW/gruni_diagonal_sw_05.png?v=20261112diagorange',
    agent_walk_diag_sw_6: 'Gruni Sprites/Caminata_Diagonal_SW/gruni_diagonal_sw_06.png?v=20261112diagorange',

    agent_walk_diag_ne_1: 'Gruni Sprites/Caminata_Diagonal_NE/gruni_diagonal_ne_01.png?v=20261112diagorange',
    agent_walk_diag_ne_2: 'Gruni Sprites/Caminata_Diagonal_NE/gruni_diagonal_ne_02.png?v=20261112diagorange',
    agent_walk_diag_ne_3: 'Gruni Sprites/Caminata_Diagonal_NE/gruni_diagonal_ne_03.png?v=20261112diagorange',
    agent_walk_diag_ne_4: 'Gruni Sprites/Caminata_Diagonal_NE/gruni_diagonal_ne_04.png?v=20261112diagorange',
    agent_walk_diag_ne_5: 'Gruni Sprites/Caminata_Diagonal_NE/gruni_diagonal_ne_05.png?v=20261112diagorange',
    agent_walk_diag_ne_6: 'Gruni Sprites/Caminata_Diagonal_NE/gruni_diagonal_ne_06.png?v=20261112diagorange',

    agent_walk_diag_nw_1: 'Gruni Sprites/Caminata_Diagonal_NW/gruni_diagonal_nw_01.png?v=20261112diagorange',
    agent_walk_diag_nw_2: 'Gruni Sprites/Caminata_Diagonal_NW/gruni_diagonal_nw_02.png?v=20261112diagorange',
    agent_walk_diag_nw_3: 'Gruni Sprites/Caminata_Diagonal_NW/gruni_diagonal_nw_03.png?v=20261112diagorange',
    agent_walk_diag_nw_4: 'Gruni Sprites/Caminata_Diagonal_NW/gruni_diagonal_nw_04.png?v=20261112diagorange',
    agent_walk_diag_nw_5: 'Gruni Sprites/Caminata_Diagonal_NW/gruni_diagonal_nw_05.png?v=20261112diagorange',
    agent_walk_diag_nw_6: 'Gruni Sprites/Caminata_Diagonal_NW/gruni_diagonal_nw_06.png?v=20261112diagorange',

    gruni_walk: 'assets/sprites/gruni/gruni_walk.png',
    malo_walk_side_1: 'Gruni Sprites/Paso MALO 1.png',
    malo_walk_side_2: 'Gruni Sprites/Paso MALO 2.png',
    malo_walk_side_3: 'Gruni Sprites/Paso MALO 3.png',
    malo_walk_side_4: 'Gruni Sprites/Paso MALO 4.png',
    malo_walk_front_1: 'Gruni Sprites/Paso MALO frente 1.png',
    malo_walk_front_2: 'Gruni Sprites/Paso MALO frente 2.png',
    malo_walk_front_3: 'Gruni Sprites/Paso MALO frente 3.png',
    malo_walk_front_4: 'Gruni Sprites/Paso MALO frente 4.png',
    gruni_run: 'assets/sprites/gruni/gruni_run.png',
    gruni_axe: 'assets/sprites/gruni/gruni_axe.png',
    gruni_attack: 'assets/sprites/gruni/gruni_attack.png',
    gruni_mine: 'assets/sprites/gruni/gruni_mine.png',
    casa_1: 'Casa/Casa 1.png?v=20261111finalclean',
    casa_2: 'Casa/Casa 2.png?v=20261111finalclean',
    casa_3: 'Casa/Casa entera.png?v=20261111finalclean',
    iso_arbol_1: 'Vegetación/Arbol A.png?v=20261111finalclean',
    iso_arbol_2: 'Vegetación/Arbol B.png?v=20261111finalclean',
    iso_arbol_3: 'Vegetación/Arbol C.png?v=20261111finalclean',
    iso_arbol_4: 'Vegetación/Arbol E.png?v=20261111finalclean',
    iso_arbol_5: 'Vegetación/Arbol F.png?v=20261111finalclean',
    iso_arbol_medio_1: 'Vegetación/Arbol A medio.png?v=20261111finalclean',
    iso_arbol_medio_2: 'Vegetación/Arbol B medio.png?v=20261111finalclean',
    iso_arbol_medio_3: 'Vegetación/Arbol C medio.png?v=20261111finalclean',
    iso_arbol_medio_4: 'Vegetación/Arbol E medio.png?v=20261111finalclean',
    iso_arbol_medio_5: 'Vegetación/Arbol F medio.png?v=20261111finalclean',
    iso_frutal_1: 'Vegetación/Arbol D frutal.png?v=20261111finalclean',
    iso_frutal_medio_1: 'Vegetación/Arbol D frutal medio.png?v=20261111finalclean',
    iso_tronco_1: 'Vegetación/no/iso_tronco_1.png?v=20261111finalclean',
    iso_tronco_2: 'Vegetación/no/iso_tronco_2.png?v=20261111finalclean',
    iso_tronco_3: 'Vegetación/no/iso_tronco_3.png?v=20261111finalclean',
    iso_tronco_5: 'Vegetación/no/iso_tronco_5.png?v=20261111finalclean',
    iso_tronco_6: 'Vegetación/no/iso_tronco_6.png?v=20261111finalclean',
    iso_tronco_7: 'Vegetación/no/iso_tronco_7.png?v=20261111finalclean',
    iso_tronco_8: 'Vegetación/no/iso_tronco_8.png?v=20261111finalclean',
    iso_tronco_9: 'Vegetación/no/iso_tronco_9.png?v=20261111finalclean',
    iso_tronco_10: 'Vegetación/no/iso_tronco_10.png?v=20261111finalclean',
    pino_1: 'Vegetación/no/Pino 1.png?v=20261110hd',
    pino_2: 'Vegetación/no/Pino 2.png?v=20261110hd',
    pino_3: 'Vegetación/no/Pino 3.png?v=20261110hd',
    nevado_1: 'Vegetación/no/Arbol nevado 1.png?v=20261110hd',
    nevado_2: 'Vegetación/no/Arbol nevado 2.png?v=20261110hd',
    nevado_3: 'Vegetación/no/Arbol nevado 3.png?v=20261110hd',
    arbol_desierto_1: 'Vegetación/no/Arbol desierto 1.png?v=20261110hd',
    arbol_desierto_2: 'Vegetación/no/Arbol desierto 2.png?v=20261110hd',
    arbol_desierto_3: 'Vegetación/no/Arbol desierto 3.png?v=20261110hd',
    arbusto_1: 'Vegetación/no/Arbusto 1.png',
    arbusto_2: 'Vegetación/no/Arbusto 2.png',
    telescopio: 'Telescopio/Telescopio.png',
    libro: 'Libros/Libro 1.png',
    mercado: 'Mercado.png',
    iso_house: 'Casa/house_template_detailed.png',
    libro_astronomia: 'Libros/Libro-astronomía.png',
    libro_fauna: 'Libros/Libro-fauna.png',
    libro_herreria: 'Libros/Libro-herrería.png',
    muralla: 'Muralla/Muralla.png',
    muralla_x: 'Muralla/muralla_x.png',
    muralla_y: 'Muralla/muralla_y.png',
    muralla_pilar: 'Muralla/muralla_pilar.png',
    muralla_porton_x: 'Muralla/muralla_porton_x.png',
    muralla_porton_y: 'Muralla/muralla_porton_y.png',
    rocas_1: 'Rocas/Rocas 1.png',
    rocas_2: 'Rocas/Rocas 2.png',
    bg_aldea_campo: 'Zonas/Aldea y campo.jpg',
    bg_bosque_magico: 'Zonas/Bosque mágico.jpg',
    bg_bosque_rio: 'Zonas/Bosque y río.jpg',
    bg_cementerio_animales: 'Zonas/Cementerio de animales.jpg',
    bg_desierto: 'Zonas/Desierto.jpg',
    bg_montanas_nevadas: 'Zonas/Montañas nevadas.jpg',
    bg_playa: 'Zonas/Playa.jpg',
    bg_pradera: 'Zonas/Pradera.jpg',
    bg_zonas_hielo: 'Zonas/Zonas de hielo.jpg',
    tile_grass_1: 'Biomas/Tiles/hd/grass_1.png',
    tile_grass_2: 'Biomas/Tiles/hd/grass_2.png',
    tile_grass_3: 'Biomas/Tiles/hd/grass_3.png',
    tile_grass_flowers: 'Biomas/Tiles/hd/grass_flowers.png',
    tile_grass_short_1: 'Biomas/Tiles/hd/grass_short_1.png',
    tile_grass_short_2: 'Biomas/Tiles/hd/grass_short_2.png',
    tile_grass_forest: 'Biomas/Tiles/hd/grass_forest.png',
    tile_grass_gold: 'Biomas/Tiles/hd/grass_gold.png',
    tile_grass_olive: 'Biomas/Tiles/hd/grass_olive.png',
    tile_dirt_1: 'Biomas/Tiles/hd/dirt_1.png?v=20261111tiles',
    tile_dirt_2: 'Biomas/Tiles/hd/dirt_2.png?v=20261111tiles',
    tile_dirt_cracked: 'Biomas/Tiles/hd/dirt_cracked.png?v=20261111tiles2',
    tile_water_1: 'Biomas/Tiles/hd/water_1.png?v=20261111tiles',
    tile_water_2: 'Biomas/Tiles/hd/water_2.png?v=20261111tiles',
    tile_water_lily: 'Biomas/Tiles/hd/water_lily.png?v=20261111tiles2',
    tile_sand_1: 'Biomas/Tiles/hd/sand_1.png?v=20261111tiles',
    tile_sand_2: 'Biomas/Tiles/hd/sand_2.png?v=20261111tiles',
    tile_sand_flat: 'Biomas/Tiles/hd/sand_flat.png?v=20261111tiles',
    tile_sand_pebble: 'Biomas/Tiles/hd/sand_pebble.png?v=20261111tiles',
    tile_sand_tuft: 'Biomas/Tiles/hd/sand_tuft.png?v=20261111tiles',
    tile_desert_cracked: 'Biomas/Tiles/hd/desert_cracked.png?v=20261111tiles',
    tile_desert_shrub: 'Biomas/Tiles/hd/desert_shrub.png?v=20261111tiles',
    tile_cemetery_1: 'Biomas/Tiles/hd/cemetery_1.png?v=20261111tiles',
    tile_cemetery_2: 'Biomas/Tiles/hd/cemetery_2.png?v=20261111tiles',
    tile_cemetery_skull: 'Biomas/Tiles/hd/cemetery_skull.png?v=20261111tiles',
    tile_snow_1: 'Biomas/Tiles/hd/snow_1.png?v=20261111tiles',
    tile_snow_2: 'Biomas/Tiles/hd/snow_2.png?v=20261111tiles',
    tile_snow_tuft: 'Biomas/Tiles/hd/snow_tuft.png?v=20261111tiles2',
    tile_ice_1: 'Biomas/Tiles/hd/ice_1.png?v=20261111tiles',
    tile_ice_2: 'Biomas/Tiles/hd/ice_2.png?v=20261111tiles',
    tile_ice_crystal: 'Biomas/Tiles/hd/ice_crystal.png?v=20261111tiles2',
    tile_magic_1: 'Biomas/Tiles/hd/magic_1.png',
    tile_magic_2: 'Biomas/Tiles/hd/magic_2.png',
    tile_magic_short: 'Biomas/Tiles/hd/magic_short.png',
    tile_marsh_1: 'Biomas/Tiles/hd/marsh_1.png?v=20261111tiles',
    tile_marsh_2: 'Biomas/Tiles/hd/marsh_2.png?v=20261111tiles',
    tile_marsh_cracked: 'Biomas/Tiles/hd/marsh_cracked.png?v=20261111tiles'
};

function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.error('No se pudo cargar la imagen: ' + url);
            resolve(null); // Resolvemos null en vez de trabar todo
        };
        img.src = url;
    });
}

async function loadAssets() {
    const entries = Object.entries(imageUrls);
    // Priorizar tiles HD, fondo inicial y primeros frames para que la pantalla aparezca al instante
    const priorityKeys = new Set([
        'bg_pradera', 'bg_montanas_nevadas', 'bg_desierto', 'bg_bosque_rio', 'bg_aldea_campo',
        'agent_walk_side_1', 'agent_walk_front_1', 'agent_walk_back_1',
        'agent_action_chop', 'agent_action_mine', 'agent_action_build', 'agent_action_attack',
        'iso_arbol_1', 'iso_arbol_2', 'iso_arbol_3', 'iso_arbol_4', 'iso_arbol_5',
        'iso_arbol_medio_1', 'iso_arbol_medio_2', 'iso_arbol_medio_3', 'iso_arbol_medio_4', 'iso_arbol_medio_5',
        'iso_frutal_1', 'iso_frutal_medio_1', 'rocas_1', 'rocas_2', 'casa_1', 'casa_2', 'casa_3', 'muralla'
    ]);
    for (const [k] of entries) {
        if (k.startsWith('tile_') || k.startsWith('agent_walk_diag_')) priorityKeys.add(k);
    }

    const priorityEntries = entries.filter(([k]) => priorityKeys.has(k));
    const secondaryEntries = entries.filter(([k]) => !priorityKeys.has(k));

    await Promise.all(priorityEntries.map(async ([key, url]) => {
        IMAGES[key] = await loadImage(url);
    }));

    // Cargar el resto de los frames y fondos en paralelo en segundo plano
    Promise.all(secondaryEntries.map(async ([key, url]) => {
        IMAGES[key] = await loadImage(url);
    })).then(() => {
        if (renderer) renderer._bakedZoneKey = null;
    });
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const world = new World();
const agent = new Agent(world);
let enemies = [];
let wolf = null;
const renderer = new Renderer(canvas);


let gamePaused = false;
let eclipseTimer = 0;
let isEclipse = false;
let firstEnemySpawned = false;
let lastStateDesc = '';
let bookSpawned = false;
let bookCooldownTimer = 120; // Starts at 60 seconds

const BRANCH_DESCRIPTIONS = {
    'ASTRONOMY': '🔭 ASTRONOMÍA: Puede construir telescopios para predecir eclipses.',
    'BIOLOGY': '🐺 BIOLOGÍA: Gruni tiene una mascota lobo que lo ayuda.',
    'BLACKSMITH': '⚒️ HERRERÍA: Forja espadas más fuertes que duran más.'
};
let lastBranchesCount = 0;

// Elementos de la UI
const barHunger = document.getElementById('bar-hunger');
const barThirst = document.getElementById('bar-thirst');
const barHp = document.getElementById('bar-hp');
const invWood = document.getElementById('inv-wood');
const invRock = document.getElementById('inv-rock');
const invPickaxes = document.getElementById('inv-pickaxes');
const invSword = document.getElementById('inv-sword');
const invHouse = document.getElementById('inv-house');
const invTelescope = document.getElementById('inv-telescope');
const invWall = document.getElementById('inv-wall');

const statTelescope = document.getElementById('stat-telescope');
const craftTeleW = document.getElementById('craft-tele-w');
const craftTeleR = document.getElementById('craft-tele-r');
const barCraftTele = document.getElementById('bar-craft-tele');

const statWall = document.getElementById('stat-wall');
const craftWallW = document.getElementById('craft-wall-w');
const barCraftWall = document.getElementById('bar-craft-wall');
const craftPickW = document.getElementById('craft-pick-w');
const craftPickR = document.getElementById('craft-pick-r');
const barCraftPickaxe = document.getElementById('bar-craft-pickaxe');

const craftSwordW = document.getElementById('craft-sword-w');
const craftSwordR = document.getElementById('craft-sword-r');
const barCraftSword = document.getElementById('bar-craft-sword');

const craftHouseW = document.getElementById('craft-house-w');
const craftHouseR = document.getElementById('craft-house-r');
const barCraftHouse = document.getElementById('bar-craft-house');

let lastTime = 0;
let spawnTimer = 0;
let currentTickRate = 500; // Milisegundos por cada tick lógico del agente
let timeOfDay = 0; // Se actualiza dinámicamente

const gruniTimeEl = document.getElementById('gruni-time');

// Epoch persistente para contar el "Año" de Gruni (cuántos días reales pasaron desde el primer arranque)
let gruniEpoch = localStorage.getItem('gruni_birth');
if (!gruniEpoch) {
    gruniEpoch = Date.now();
    localStorage.setItem('gruni_birth', gruniEpoch);
} else {
    gruniEpoch = parseInt(gruniEpoch);
}

function updateGruniTime() {
    // Forma más robusta: parsear con en-US y timezone Buenos_Aires
    const now = new Date();
    const argDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));

    const hours   = argDate.getHours();
    const minutes = argDate.getMinutes();
    const seconds = argDate.getSeconds();
    const day     = argDate.getDate();
    const month   = argDate.getMonth(); // 0-11
    const year    = argDate.getFullYear();

    // Hora formateada HH:MM
    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');

    // Fecha en español
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const diaNombre = diasSemana[argDate.getDay()];
    const mesNombre = meses[month];

    // Año de Gruni: sube 1 en el aniversario exacto
    const birthDate = new Date(new Date(gruniEpoch).toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    let gruniYear = year - birthDate.getFullYear();
    if (month < birthDate.getMonth() || (month === birthDate.getMonth() && day < birthDate.getDate())) gruniYear--;

    // Día de Gruni: días reales transcurridos desde el nacimiento + 1
    const msPerDay = 86400000;
    const gruniDay = Math.floor((Date.now() - gruniEpoch) / msPerDay) + 1;

    if (gruniTimeEl) {
        gruniTimeEl.innerText = `Año ${gruniYear} · Día ${gruniDay}  ·  ${diaNombre} ${day} ${mesNombre} ${year}  ·  ${hStr}:${mStr}`;
    }

    // timeOfDay: 0 a 2400 representando las 24hs
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return (totalSeconds / 86400) * 2400;
}

const particles = new ParticleSystem();

const branchText = document.getElementById('agent-branch');

const dialogueBubble = document.getElementById('gruni-dialogue');
const dialogueText = document.getElementById('gruni-dialogue-text');
let dialogueTimer = 0;

function showDialogue(text, timeTicks = 15) {
    dialogueText.innerText = text;
    dialogueBubble.style.display = 'block';
    dialogueTimer = timeTicks;
}

function selectBranch(branch) {
    if (!agent.branches.includes(branch)) {
        agent.branches.push(branch);
    }
    
    let text = [];
    if (agent.branches.includes('ASTRONOMY')) text.push('🔭 Astronomía');
    if (agent.branches.includes('BIOLOGY')) text.push('🐺 Biología');
    if (agent.branches.includes('BLACKSMITH')) text.push('⚒️ Herrería');
    branchText.innerText = text.join(' | ');

    if (branch === 'BIOLOGY') {
        wolf = new Wolf(world, agent.x, agent.y);
        showDialogue("¡Un lobo amistoso! Lo llamaré Firulais.", 15);
    } else if (branch === 'ASTRONOMY') {
        showDialogue("Las estrellas me guiarán...", 15);
    } else if (branch === 'BLACKSMITH') {
        showDialogue("¡Siento el poder del metal en mis manos!", 15);
    }
}

// ─── Persistencia del Mundo y Agente (Guardado y Carga Canónicos) ────────────
const SAVE_KEY = 'gruni_world_save_v1';
let autoSaveTickCounter = 0;

function saveGame() {
    try {
        const data = {
            version: 1,
            savedAt: Date.now(),
            world: world.serialize(),
            agent: agent.serialize(),
            firstEnemySpawned,
            eclipseTimer,
            isEclipse,
            wolf: wolf ? { x: wolf.x, y: wolf.y, hp: wolf.hp } : null
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Error al guardar partida:', e);
    }
}

function restoreBranches() {
    if (!agent.branches || agent.branches.length === 0) return;
    let text = [];
    if (agent.branches.includes('ASTRONOMY')) text.push('🔭 Astronomía');
    if (agent.branches.includes('BIOLOGY')) text.push('🐺 Biología');
    if (agent.branches.includes('BLACKSMITH')) text.push('⚒️ Herrería');
    if (branchText) branchText.innerText = text.join(' | ');

    const knowledgeLog = document.getElementById('knowledge-log');
    const knowledgeList = document.getElementById('knowledge-list');
    if (knowledgeLog && knowledgeList) {
        knowledgeLog.style.display = 'block';
        knowledgeList.innerHTML = '';
        agent.branches.forEach(b => {
            let desc = BRANCH_DESCRIPTIONS[b] || b;
            let li = document.createElement('li');
            li.innerText = desc;
            li.style.marginBottom = '5px';
            knowledgeList.appendChild(li);
        });
        lastBranchesCount = agent.branches.length;
    }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data || !data.world || !data.agent) return false;

        world.deserialize(data.world);
        agent.deserialize(data.agent);

        if (data.agent.currentZoneId && world.grids[data.agent.currentZoneId]) {
            world.loadZone(data.agent.currentZoneId);
        }

        firstEnemySpawned = !!data.firstEnemySpawned;
        eclipseTimer = data.eclipseTimer || 0;
        isEclipse = !!data.isEclipse;

        restoreBranches();

        if (agent.branches.includes('BIOLOGY')) {
            const wx = (data.wolf && data.wolf.x !== undefined) ? data.wolf.x : agent.x;
            const wy = (data.wolf && data.wolf.y !== undefined) ? data.wolf.y : agent.y;
            wolf = new Wolf(world, wx, wy);
            if (data.wolf && data.wolf.hp !== undefined) wolf.hp = data.wolf.hp;
        }

        updateMinimap();
        updateUI();
        console.log('✅ Mundo persistente cargado con éxito.');
        return true;
    } catch (e) {
        console.warn('Error al cargar partida guardada:', e);
        return false;
    }
}

function resetGame() {
    if (confirm('¿Estás seguro de que quieres reiniciar el mundo de Gruni e iniciar una Nueva Era? Esto restaurará el mundo canónico y reiniciará a Gruni.')) {
        localStorage.removeItem(SAVE_KEY);
        window.location.reload();
    }
}

function updateUI() {
    barHunger.style.width = `${agent.hunger}%`;
    barThirst.style.width = `${agent.thirst}%`;
    barHp.style.width = `${(agent.hp / agent.maxHp) * 100}%`;
    
    let stateDesc = agent.state;
    if (agent.state === STATES.SEEK_WOOD || agent.state === STATES.SEEK_ROCK) {
        let purpose = 'guardar en el inventario';
        switch (agent.emergencyMission) {
            case 'PICKAXE': purpose = 'hacer un Pico'; break;
            case 'SWORD': purpose = 'forjar una Espada'; break;
            case 'BUILD_HOUSE': purpose = 'construir su Casa'; break;
            case 'RESTORE_HOUSE': purpose = 'reparar su Casa'; break;
            case 'BUILD_TELESCOPE': purpose = 'construir un Telescopio'; break;
            case 'BUILD_WALLS': purpose = 'construir Murallas'; break;
        }
        stateDesc += ` para ${purpose}`;
    } else if (agent.state === STATES.SEEK_FOOD) {
        stateDesc += ' para comer';
    } else if (agent.state === STATES.SEEK_WATER) {
        stateDesc += ' para saciar su sed';
    } else if (agent.state === STATES.BUILDING_HOUSE) {
        stateDesc = 'Construyendo el hogar de sus sueños...';
    } else if (agent.state === STATES.SEEK_BOOK) {
        stateDesc = '¡Intrigado por un misterioso libro mágico!';
    }
    
    if (dialogueTimer <= 0) {
        dialogueText.innerText = stateDesc || "...";
        dialogueBubble.style.display = 'block';
    }
    
    lastStateDesc = stateDesc;
    
    invWood.innerText = agent.inventory.wood;
    invRock.innerText = agent.inventory.rock;
    invPickaxes.innerText = agent.inventory.pickaxes;
    invSword.innerText = agent.swordDurability > 0 ? `Sí (${agent.swordDurability})` : 'No';
    invHouse.innerText = agent.home ? 'Sí' : 'No';
    invTelescope.innerText = agent.hasTelescope ? 'Sí' : 'No';
    
    let wallsCount = 0;
    for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
            if (world.grid[y][x].type === RESOURCES.WALL) wallsCount++;
        }
    }
    invWall.innerText = wallsCount;

    if (agent.branches.length > lastBranchesCount) {
        document.getElementById('knowledge-log').style.display = 'block';
        let newBranch = agent.branches[agent.branches.length - 1];
        let desc = BRANCH_DESCRIPTIONS[newBranch] || newBranch;
        let li = document.createElement('li');
        li.innerText = desc;
        li.style.marginBottom = '5px';
        document.getElementById('knowledge-list').appendChild(li);
        lastBranchesCount = agent.branches.length;
    }

    let pw = Math.min(agent.inventory.wood, 2);
    let pr = Math.min(agent.inventory.rock, 2);
    craftPickW.innerText = pw;
    craftPickR.innerText = pr;
    if (agent.inventory.pickaxes > 0) {
        barCraftPickaxe.style.width = '100%';
        barCraftPickaxe.style.background = '#22c55e';
    } else {
        barCraftPickaxe.style.width = `${((pw + pr) / 4) * 100}%`;
        barCraftPickaxe.style.background = '#78716c';
    }

    let swordWood = Math.min(agent.inventory.wood, 2);
    let swordRock = Math.min(agent.inventory.rock, 2);
    craftSwordW.innerText = swordWood;
    craftSwordR.innerText = swordRock;
    let swordProgress = ((swordWood / 2) * 50) + ((swordRock / 2) * 50);
    // Si la espada ya está crafteada, mostramos 100% de otro color
    if (agent.swordDurability > 0) {
        barCraftSword.style.width = `100%`;
        barCraftSword.style.background = '#eab308';
    } else {
        barCraftSword.style.width = `${swordProgress}%`;
        barCraftSword.style.background = '#a16207';
    }

    let houseWood = Math.min(agent.inventory.wood, 3);
    let houseRock = Math.min(agent.inventory.rock, 3);
    craftHouseW.innerText = houseWood;
    craftHouseR.innerText = houseRock;
    if (agent.homeStage >= 3) {
        let homeCell = world.getCell(agent.home.x, agent.home.y);
        let hpPct = homeCell ? (homeCell.capacity / 10) * 100 : 100;
        barCraftHouse.style.width = `${hpPct}%`;
        barCraftHouse.style.background = hpPct < 100 ? '#eab308' : '#22c55e'; // Amarillo si está dañada
    } else {
        barCraftHouse.style.width = `${((houseWood + houseRock) / 6) * 100}%`;
        barCraftHouse.style.background = '#f43f5e'; // Rojo mientras junta madera
    }

    // Telescopio
    let tw = Math.min(agent.inventory.wood, 2);
    let tr = Math.min(agent.inventory.rock, 2);
    craftTeleW.innerText = tw;
    craftTeleR.innerText = tr;
    if (agent.hasTelescope) {
        barCraftTele.style.width = '100%';
        barCraftTele.style.background = '#22c55e';
    } else {
        barCraftTele.style.width = `${((tw + tr) / 4) * 100}%`;
        barCraftTele.style.background = '#3b82f6';
    }

    // Muralla
    let ww = Math.min(agent.inventory.wood, 1);
    craftWallW.innerText = ww;
    barCraftWall.style.width = `${ww * 100}%`;
    barCraftWall.style.background = agent.emergencyMission === 'BUILD_WALLS' ? '#f43f5e' : '#64748b';

    updateMinimap();
}

// ─── Minimapa de Biomas (Matriz 3x3 de Rectángulos) ──────────────────────
const minimapPanel = document.getElementById('biome-minimap-panel');
const minimapZoneName = document.getElementById('minimap-zone-name');
const minimapCoords = document.getElementById('minimap-coords');
const minimapMarker = document.getElementById('gruni-map-marker');
const minimapToggleBtn = document.getElementById('minimap-toggle-btn');
const minimapZones = document.querySelectorAll('.minimap-zone');

if (minimapToggleBtn && minimapPanel) {
    minimapToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        minimapPanel.classList.toggle('collapsed');
        minimapToggleBtn.innerText = minimapPanel.classList.contains('collapsed') ? '➕' : '─';
    });
}

minimapZones.forEach(zoneEl => {
    zoneEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetZoneId = zoneEl.dataset.zone;
        if (targetZoneId && targetZoneId !== world.currentZoneId) {
            world.loadZone(targetZoneId);
            agent.x = Math.floor(world.width / 2);
            agent.y = Math.floor(world.height / 2);
            agent.renderX = agent.x;
            agent.renderY = agent.y;
            agent.path = [];
            agent.target = null;
            if (enemies) enemies.length = 0;
            if (wolf) { wolf.x = agent.x; wolf.y = agent.y; }
            updateMinimap();
        }
    });
});

function updateMinimap() {
    const currentZoneId = world.currentZoneId;
    if (minimapZoneName && world.currentZone) {
        minimapZoneName.innerText = world.currentZone.name;
    }
    
    const ax = agent.renderX !== undefined ? agent.renderX : agent.x;
    const ay = agent.renderY !== undefined ? agent.renderY : agent.y;
    
    if (minimapCoords) {
        minimapCoords.innerText = `(${Math.round(ax)}, ${Math.round(ay)})`;
    }
    
    minimapZones.forEach(zoneEl => {
        if (zoneEl.dataset.zone === currentZoneId) {
            if (!zoneEl.classList.contains('is-current')) {
                zoneEl.classList.add('is-current');
            }
            if (minimapMarker && minimapMarker.parentElement !== zoneEl) {
                zoneEl.appendChild(minimapMarker);
            }
        } else {
            zoneEl.classList.remove('is-current');
        }
    });
    
    if (minimapMarker && world.width > 0 && world.height > 0) {
        const pctX = Math.max(12, Math.min(88, (ax / world.width) * 100));
        const pctY = Math.max(14, Math.min(86, (ay / world.height) * 100));
        minimapMarker.style.left = `${pctX}%`;
        minimapMarker.style.top = `${pctY}%`;
    }
}

function runTick() {
    if (gamePaused) return;

    try {
        if (dialogueTimer > 0) {
            dialogueTimer--;
        }

        let eclipseWarning = eclipseTimer > 7100 && eclipseTimer < 7160; // Aviso 50s antes del eclipse
        
        // Auto-select book branch (Twitch 24/7 Mode)
        if (agent.bookFound && agent.branches.length < 3) {
            let branchName = 'ASTRONOMY';
            if (agent.pickedBookBranch === 1) branchName = 'BIOLOGY';
            if (agent.pickedBookBranch === 2) branchName = 'BLACKSMITH';
            selectBranch(branchName);
            agent.bookFound = false; // Reset to avoid infinite loop
            bookSpawned = false; // Allow a new book to spawn later
            bookCooldownTimer = 180; // 90 seconds cooldown after reading
        }

        agent.update(enemies, eclipseWarning);

        if (wolf) wolf.update(agent, enemies);

        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update(agent, wolf);
            if (enemies[i].hp <= 0) {
                enemies.splice(i, 1);
            }
        }

        // Eclipse logic (Ciclo de 70 segundos: 50s luz, 20s eclipse)
        if (firstEnemySpawned) {
            eclipseTimer++;

            if (eclipseTimer === 7100 && agent.branches.includes('ASTRONOMY') && agent.hasTelescope) {
                showDialogue("¡Un eclipse se acerca! Rápido, a prepararnos.", 15);
            }

            if (eclipseTimer === 7160) {
                isEclipse = true;
                
                // Spawn inmediato de 2 enemigos al comenzar el eclipse
                let edgeX = Math.random() > 0.5 ? 0 : world.width - 1;
                let edgeY = Math.floor(Math.random() * world.height);
                enemies.push(new Enemy(world, edgeX, edgeY));
                
                let edgeX2 = Math.random() > 0.5 ? 0 : world.width - 1;
                let edgeY2 = Math.floor(Math.random() * world.height);
                enemies.push(new Enemy(world, edgeX2, edgeY2));

                if (!agent.branches.includes('ASTRONOMY')) {
                    showDialogue("¡Oh no! Un eclipse... De haber estudiado astronomía lo hubiese sabido.", 15);
                }
            }
            if (eclipseTimer >= 7200) {
                isEclipse = false;
                eclipseTimer = 0;
            }
        }

        if (agent.branches.length > 0) {
            spawnTimer++;
            const MAX_ENEMIES = isEclipse ? 6 : 4; // Límite: 4 normal, 6 en eclipse
            let spawnRate = isEclipse ? 40 : 120; // Normal: 1 cada 60s | Eclipse: 1 cada 20s
            if (spawnTimer >= spawnRate && enemies.length < MAX_ENEMIES) {
                spawnTimer = 0;
                let edgeX = Math.random() > 0.5 ? 0 : world.width - 1;
                let edgeY = Math.floor(Math.random() * world.height);
                enemies.push(new Enemy(world, edgeX, edgeY));
                firstEnemySpawned = true;
            } else if (spawnTimer >= spawnRate) {
                spawnTimer = 0; // Resetear igual aunque no spawneemos
            }
        }
        
        // Book spawning
        if (agent.branches.length < 3) {
            if (agent.homeStage === 3 && !bookSpawned) {
                if (bookCooldownTimer > 0) bookCooldownTimer--;
                if (bookCooldownTimer === 0) {
                    let emptyX = Math.floor(Math.random() * world.width);
                    let emptyY = Math.floor(Math.random() * world.height);
                    let targetCell = world.getCell(emptyX, emptyY);
                    if (targetCell && targetCell.type === RESOURCES.EMPTY) {
                        const availableBranches = ['ASTRONOMY', 'BIOLOGY', 'BLACKSMITH'].filter(b => !agent.branches.includes(b));
                        if (availableBranches.length > 0) {
                            const randomBranch = availableBranches[Math.floor(Math.random() * availableBranches.length)];
                            world.setCell(emptyX, emptyY, RESOURCES.BOOK);
                            let branchId = 0;
                            if (randomBranch === 'BIOLOGY') branchId = 1;
                            if (randomBranch === 'BLACKSMITH') branchId = 2;
                            world.getCell(emptyX, emptyY).capacity = branchId;
                            bookSpawned = true;
                        }
                    } else {
                        bookCooldownTimer = 1; // Try again next tick
                    }
                }
            }
        }

        world.regenLoop(agent);
        agent.updateEmotion(enemies);
        
        autoSaveTickCounter++;
        if (autoSaveTickCounter >= 20) {
            autoSaveTickCounter = 0;
            saveGame();
        }

        updateUI();
    } catch (err) {
        console.error('Error in runTick:', err);
    }
}

function gameLoop(timestamp) {
    // Sincronizar el tiempo del juego con el tiempo real transcurrido
    timeOfDay = updateGruniTime();

    if (!gamePaused) {
        particles.update(timeOfDay);

        // Ambient Spawns
        if (Math.random() < 0.05) { // 5% chance por frame de spawnear hoja
            let rx = Math.floor(Math.random() * world.width);
            let ry = Math.floor(Math.random() * world.height);
            let cell = world.getCell(rx, ry);
            if (cell && cell.type === RESOURCES.WOOD) {
                particles.spawnLeaf(rx * CELL_SIZE + CELL_SIZE/2, ry * CELL_SIZE + CELL_SIZE/2 - 20);
            }
        }

        if (Math.random() < 0.02) { // 2% chance de luciérnaga
            let rx = Math.floor(Math.random() * world.width);
            let ry = Math.floor(Math.random() * world.height);
            let cell = world.getCell(rx, ry);
            if (cell && cell.type === RESOURCES.WATER) {
                particles.spawnFirefly(rx * CELL_SIZE + Math.random()*CELL_SIZE, ry * CELL_SIZE + Math.random()*CELL_SIZE);
            }
        }
    }
    
    let eclipseWarning = eclipseTimer > 7100 && eclipseTimer < 7160;
    try {
        renderer.draw(world, agent, enemies, wolf, eclipseWarning, timestamp, timeOfDay, particles);
        updateMinimap();
    } catch (e) {
        if (!window.renderedError) {
            window.renderedError = true;
            document.body.innerHTML += '<div style="position:fixed; top:0; left:0; background:red; color:white; z-index:9999; font-size:20px; padding:20px;">' + e.message + '<br>' + e.stack + '</div>';
        }
    }
    requestAnimationFrame(gameLoop);
}

// Web Worker para mantener la simulación lógica activa en segundo plano
const workerCode = `
    let timerId = null;
    self.onmessage = function(e) {
        if (e.data.action === 'start') {
            if (timerId) clearInterval(timerId);
            timerId = setInterval(() => {
                self.postMessage({ type: 'tick' });
            }, e.data.interval);
        } else if (e.data.action === 'stop') {
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
        }
    };
`;
const blob = new Blob([workerCode], { type: 'application/javascript' });
const timerWorker = new Worker(URL.createObjectURL(blob));

timerWorker.onmessage = function(e) {
    if (e.data.type === 'tick') {
        runTick();
    }
};

// Iniciar el bucle
loadAssets().then(() => {
    renderer.initImages(IMAGES);
    loadGame();
    window.game = { 
        world, 
        agent, 
        getEnemies: () => enemies, 
        setEnemies: (val) => enemies = val, 
        getWolf: () => wolf, 
        setWolf: (val) => wolf = val, 
        Enemy, 
        Wolf, 
        RESOURCES, 
        STATES,
        saveGame,
        loadGame,
        resetGame
    };
    
    // Actualizar UI inicialmente
    updateUI();
    
    // Iniciar temporizador lógico del Web Worker
    timerWorker.postMessage({ action: 'start', interval: currentTickRate });
    
    requestAnimationFrame(gameLoop);
});

// Guardado en cierre o cambio de pestaña
window.addEventListener('beforeunload', () => {
    saveGame();
});

window.addEventListener('pagehide', () => {
    saveGame();
});

const btnResetWorld = document.getElementById('btn-reset-world');
if (btnResetWorld) {
    btnResetWorld.addEventListener('click', (e) => {
        e.stopPropagation();
        resetGame();
    });
}

// Lógica para mover la cámara (panning)
let isDraggingMap = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener('mousedown', (e) => {
    isDraggingMap = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    renderer.manualCamera = true;
});

canvas.addEventListener('mousemove', (e) => {
    if (isDraggingMap) {
        const dpr = window.devicePixelRatio || 1;
        const dx = (e.clientX - lastMouseX) * dpr;
        const dy = (e.clientY - lastMouseY) * dpr;
        
        // ZOOM se importa de world.js y está configurado en renderer.js
        renderer.cameraX -= dx / (ZOOM * dpr);
        renderer.cameraY -= dy / (ZOOM * dpr);
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

window.addEventListener('mouseup', () => {
    isDraggingMap = false;
});

canvas.addEventListener('dblclick', () => {
    // Al hacer doble clic volvemos a centrar la cámara en Gruni
    renderer.manualCamera = false;
});
