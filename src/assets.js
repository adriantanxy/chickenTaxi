export const ASSETS = {
  brand: {
    logo: "/assets/brand/logo_cleaned.png",
  },

  // 9-slice frames. slice = corner size in px of your art.
  frames: {
    // card: { src: "/assets/frames/card.png", slice: 24 },
    // ribbon: { src: "/assets/frames/ribbon.png", slice: 16 },
    // button: { src: "/assets/frames/button.png", slice: 18 },
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
  },

  // Avatar paper-doll layers. Keep every PNG on the same canvas size.
  avatar: {
    // base: "/assets/avatar/base.png",
    // headwear: "/assets/avatar/helmet.png",
    // eyewear: "/assets/avatar/goggles.png",
  },
};
