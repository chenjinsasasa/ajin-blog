import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Observer } from 'gsap/Observer'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, Observer, ScrambleTextPlugin, ScrollTrigger)

export { gsap, Observer, useGSAP, ScrambleTextPlugin, ScrollTrigger }
