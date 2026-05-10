import { useState, useEffect } from 'react';

// Import all bear images statically
import watch0 from '@/assets/bear/watch_bear_0.png';
import watch1 from '@/assets/bear/watch_bear_1.png';
import watch2 from '@/assets/bear/watch_bear_2.png';
import watch3 from '@/assets/bear/watch_bear_3.png';
import watch4 from '@/assets/bear/watch_bear_4.png';
import watch5 from '@/assets/bear/watch_bear_5.png';
import watch6 from '@/assets/bear/watch_bear_6.png';
import watch7 from '@/assets/bear/watch_bear_7.png';
import watch8 from '@/assets/bear/watch_bear_8.png';
import watch9 from '@/assets/bear/watch_bear_9.png';
import watch10 from '@/assets/bear/watch_bear_10.png';
import watch11 from '@/assets/bear/watch_bear_11.png';
import watch12 from '@/assets/bear/watch_bear_12.png';
import watch13 from '@/assets/bear/watch_bear_13.png';
import watch14 from '@/assets/bear/watch_bear_14.png';
import watch15 from '@/assets/bear/watch_bear_15.png';
import watch16 from '@/assets/bear/watch_bear_16.png';
import watch17 from '@/assets/bear/watch_bear_17.png';
import watch18 from '@/assets/bear/watch_bear_18.png';
import watch19 from '@/assets/bear/watch_bear_19.png';
import watch20 from '@/assets/bear/watch_bear_20.png';

import hide0 from '@/assets/bear/hide_bear_0.png';
import hide1 from '@/assets/bear/hide_bear_1.png';
import hide2 from '@/assets/bear/hide_bear_2.png';
import hide3 from '@/assets/bear/hide_bear_3.png';
import hide4 from '@/assets/bear/hide_bear_4.png';
import hide5 from '@/assets/bear/hide_bear_5.png';

import peak0 from '@/assets/bear/peak_bear_0.png';
import peak1 from '@/assets/bear/peak_bear_1.png';
import peak2 from '@/assets/bear/peak_bear_2.png';
import peak3 from '@/assets/bear/peak_bear_3.png';

interface BearImages {
  watchBearImages: string[];
  hideBearImages: string[];
  peakBearImages: string[];
}

export function useBearImages(): BearImages {
  const watchBearImages = [
    watch0, watch1, watch2, watch3, watch4, watch5, watch6, watch7, watch8, watch9,
    watch10, watch11, watch12, watch13, watch14, watch15, watch16, watch17, watch18, watch19, watch20
  ];

  const hideBearImages = [hide0, hide1, hide2, hide3, hide4, hide5];

  const peakBearImages = [peak0, peak1, peak2, peak3];

  return {
    watchBearImages,
    hideBearImages,
    peakBearImages
  };
}
