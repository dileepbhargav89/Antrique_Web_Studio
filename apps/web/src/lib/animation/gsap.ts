import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

/**
 * Registering a GSAP plugin has zero effect until this module is actually
 * imported — nothing in the app imports it yet. That's the point: GSAP
 * (~30kb) stays out of every route's bundle until a future page's own
 * component imports `gsap`/`useGSAP` from here.
 */
gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };
