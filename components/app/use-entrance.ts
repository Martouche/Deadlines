"use client"

import { useEffect, useState } from "react"

// Partagé par tout l'onglet : passe à true une fois la première page hydratée.
let hydrated = false

/**
 * Faut-il jouer une animation d'entrée ? Non au premier chargement : `initial` doit
 * correspondre au rendu serveur (sinon contenu invisible jusqu'à l'hydratation et
 * mismatch). Oui pour les navigations suivantes côté client.
 */
export function useEntrance() {
  const [animate] = useState(() => hydrated)
  useEffect(() => {
    hydrated = true
  }, [])
  return animate
}
