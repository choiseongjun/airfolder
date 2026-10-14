import {useEffect} from 'react';
// Browser entry uses the real website. There is no second React Native web UI.
export default function Main(){useEffect(()=>{window.location.replace('/');},[]);return null;}
