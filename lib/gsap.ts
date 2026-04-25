import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrambleTextPlugin, ScrollTrigger)

export { gsap, useGSAP, ScrambleTextPlugin, ScrollTrigger }
