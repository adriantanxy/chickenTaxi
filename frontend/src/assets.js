const loadout1 = Object.freeze({
  components: Object.freeze({
    top: "/assets/avatar/loadout1/components/top.png",
    bottom: "/assets/avatar/loadout1/components/bottom.png",
    shoe: "/assets/avatar/loadout1/components/shoe.png",
    accessory1: "/assets/avatar/loadout1/components/accessory.png",
    accessory2: null,
  }),
  rotations: Object.freeze([
    "/assets/avatar/loadout1/rotations/north.png",
    "/assets/avatar/loadout1/rotations/north-east.png",
    "/assets/avatar/loadout1/rotations/east.png",
    "/assets/avatar/loadout1/rotations/south-east.png",
    "/assets/avatar/loadout1/rotations/south.png",
    "/assets/avatar/loadout1/rotations/south-west.png",
    "/assets/avatar/loadout1/rotations/west.png",
    "/assets/avatar/loadout1/rotations/north-west.png",
  ]),
});

export const ASSETS = {
  brand: {
    logo: "/assets/brand/logo_cleaned.png",
  },

  // 9-slice frames. slice = corner size in px of the source art (the painted
  // border thickness), so the middle stretches but the stitched edge doesn't.
  frames: {
    // card: { src: "/assets/frames/card.png", slice: 24 },
    // ribbon: { src: "/assets/frames/ribbon.png", slice: 16 },
    // button: { src: "/assets/frames/button.png", slice: 18 },

    // --- Squad page boards (aged leather / parchment plates) ---------------
    // Big parchment panels — used as the two main Card surfaces.
    squadCard: { src: "/assets/squad/bigger_board.png", slice: 61 },     // 1448x1086
    squadCardTall: { src: "/assets/squad/sideboard.png", slice: 143 }, // 1024x1536
    // Wide leather/green plates (2172x724) — tabs, footer plates, buttons.
    leatherWide: { src: "/assets/squad/black_board.png", slice: 154 },
    greenWide: { src: "/assets/squad/green_board.png", slice: 144 },
    parchmentWide: { src: "/assets/squad/rectangle_board.png", slice: 111 },
    // Dark leather search bar (2508x627).
    search: { src: "/assets/squad/search.png", slice: 143 },
    // Square dark-leather tile (1254x1254) — avatar / badge backings.
    leatherTile: { src: "/assets/squad/square_black_board.png", slice: 122 },

    // --- Training page boards ---------------------------------------------
    // Wide beige parchment plate (2172x724) — RECENT WORKOUT rows + TODAY rows.
    beigeWide: { src: "/assets/training/recent/beige_horizontal_board.png", slice: 120 },
    // Tall dark-leather plate (1024x1536) — MISSION / CHALLENGE cards.
    missionCard: { src: "/assets/training/mission/card_background.png", slice: 130 },
    // Wide green plate (2172x724) — REWARDS shop button.
    shopWide: { src: "/assets/training/shop/shop_backboard.png", slice: 120 },
  },

  // Common boards painted as plain backgrounds (NOT 9-slice). bio.png is a
  // fixed taped scrap whose tape lives in two corners, so stretching it as a
  // border-image breaks it — paint it full-bleed and pad text into the paper.
  commonBoards: {
    tapedScrap: "/assets/common/bio.png", // 1536x1024
    verticalBoard: "/assets/common/vertical_board.png", // 1024x1536
  },

  // Square pixel icons. Example: pushups: "/assets/icons/pushups.png",
  icons: {
    // pushups: "/assets/icons/pushups.png",
    // situps: "/assets/icons/situps.png",
    // run: "/assets/icons/stopwatch.png",
    // streak: "/assets/icons/flame.png",
    // medal: "/assets/icons/medal.png",
    // boot: "/assets/icons/boot.png",
    // dogtag: "/assets/icons/dogtag.png",
  },

  // Sidebar sprite sheet matching the generated "default" and "selected"
  // navigation-tab sheet. Put the PNG at this path, then adjust crop numbers
  // here if the export differs.
  sidebar: {
    navTabs: {
      src: "/assets/sidebar/sidebar-tabs.png",
      sheetWidth: 1211,
      sheetHeight: 825,
      tabWidth: 534,
      tabHeight: 129,
      defaultX: 19,
      selectedX: 656,
      displayWidth: 185,
      items: {
        training: { y: 19 },
        calendar: { y: 185 },
        journal: { y: 351 },
        squad: { y: 516 },
        profile: { y: 682 },
      },
    },
    navTabsClosed: {
      src: "/assets/sidebar/sidebar-tabs-closed.png",
      sheetWidth: 1448,
      sheetHeight: 1086,
      tabWidth: 229,
      tabHeight: 194,
      defaultX: 419,
      selectedX: 799,
      displayWidth: 52,
      items: {
        training: { y: 24 },
        calendar: { y: 235 },
        journal: { y: 444 },
        squad: { y: 654 },
        profile: { y: 864 },
      },
    },
    // Riveted plate behind the signed-in soldier's identity card.
    profileBackdrop: "/assets/sidebar/profile_backdrop.png", // 1536x1024
  },

  training: {
    // Stat tiles on the TRAINING OVERVIEW card. Each stat renders on the shared
    // parchment background with its own pixel-art icon. Medals map by tier.
    overview: {
      background: "/assets/training/training_overview/card_background.png",
      icons: {
        pushups: "/assets/training/training_overview/pushup.png",
        situps: "/assets/training/training_overview/situp.png",
        run: "/assets/training/training_overview/clock.png",
        streak: "/assets/training/training_overview/calendar.png",
        weekly: "/assets/training/training_overview/checklist.png",
      },
      medals: {
        gold: "/assets/training/training_overview/medal_gold.png",
        silver: "/assets/training/training_overview/medal_silver.png",
        bronze: "/assets/training/training_overview/medal_bronze.png",
        empty: "/assets/training/training_overview/medal_empty.png",
      },
    },
    sessionCards: {
      src: "/assets/training/session/training-session.png",
      sheetWidth: 2170,
      sheetHeight: 685,
      displayHeight: 210,
      items: {
        formTraining: { x: 22, y: 32, w: 446, h: 663 },
        pacer: { x: 487, y: 32, w: 407, h: 663 },
        emom: { x: 913, y: 32, w: 409, h: 663 },
        toFailure: { x: 1341, y: 32, w: 400, h: 663 },
        targetMode: { x: 1760, y: 32, w: 390, h: 663 },
      },
    },

    // TODAY'S TRAINING card — parchment plate + the day's exercise icons.
    today: {
      board: "/assets/training/today_training/beige_horizontal_board.png",
      icons: {
        pushups: "/assets/training/today_training/pushup.png",
        situps: "/assets/training/today_training/situp.png",
        run: "/assets/training/today_training/running.png",
      },
    },

    // RECENT WORKOUTS rows — small pixel exercise icons.
    recent: {
      icons: {
        pushups: "/assets/training/recent/pushup.png",
        situps: "/assets/training/recent/situp.png",
        run: "/assets/training/recent/clock.png",
      },
    },

    // MISSIONS cards — dark leather card backing + per-mission art.
    missions: {
      background: "/assets/training/mission/card_background.png",
      icons: {
        toFailure: "/assets/training/mission/pushup.png",
        weekly: "/assets/training/mission/calendar.png",
        plank: "/assets/training/mission/plank.png",
      },
    },

    // REWARDS card — XP/shop boards + medal art.
    rewards: {
      xpBoard: "/assets/training/shop/xp_backboard.png",
      shopBoard: "/assets/training/shop/shop_backboard.png",
      medals: {
        gold: "/assets/training/shop/gold_star_medal.png",
        bronze: "/assets/training/shop/bronze_star_medal.png",
      },
    },
  },

  // Journal landing — pixel-art icons + the ORD countdown plate.
  journal: {
    // ORD countdown backdrop: a blank green leather plate with a thumbs-up
    // soldier baked into the lower-right. All count text is overlaid by us.
    ordBackdrop: "/assets/journal/ord_backdrop.png",
    // Wide blank green leather plate behind the Quick Capture buttons.
    quickCaptureBoard: "/assets/journal/quick_capture_backboard.png",
    // Full-body talking soldier — the pep-talk mascot (raised finger, mouth open).
    mascot: "/assets/journal/talking_soldier.png",
    icons: {
      photo: "/assets/journal/photo.png",        // framed landscape
      milestone: "/assets/journal/milestone.png", // gold star
      medal: "/assets/journal/medal.png",         // shield + star crest
      mates: "/assets/journal/mates.png",         // two soldiers
      memories: "/assets/journal/memories.png",   // closed field book
    },
  },

  // Avatar paper-doll layers. Keep every PNG on the same canvas size.
  avatar: {
    base: "/assets/avatar/army_profile_picture.jpg",
    none: "/assets/avatar/components/none.png",
    loadouts: Object.freeze({ loadout1 }),
    rotations: loadout1.rotations,
  },
};
