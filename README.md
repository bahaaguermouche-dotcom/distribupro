# DistribuPro 📦

> **Plateforme B2B2C unifiée de distribution de gros et de commerce de détail.**

DistribuPro connecte les grossistes/distributeurs et les commerçants de proximité dans un écosystème complet, assurant la traçabilité des produits depuis le carton d'entrepôt jusqu'à la pièce vendue au comptoir.

---

## 🏛️ Architecture du Projet (Monorepo)

Le dépôt regroupe 3 applications interconnectées :

```
fin_______pro/
├── apps/
│   ├── admin/          # Plateforme Administrateur (Next.js / TypeScript)
│   ├── distributor/    # Espace Grossiste & Distributeur (Vite + React / Electron)
│   └── retailer/       # Espace Commerçant & Boutique (Vite + React / Electron)
├── .gitignore
└── README.md
```

### 1. `apps/admin` (Portail Administrateur)
- **Gestion de la taxonomie :** Catégories, sous-catégories et arborescence globale.
- **Gestion des marques & logos :** Téléversement Cloudinary et assignation.
- **Catalogue centralisé :** Définition des produits de référence et conditionnement ($N$ pièces / carton).
- **Validation & Contrôle :** Agrément et gestion des distributeurs par secteur géographique.

### 2. `apps/distributor` (Espace Grossiste & Entrepôt)
- **Gestion intelligente des stocks par lots (FEFO) :**
  - 🟢 **Vert :** Lot actif vendu en priorité selon la date de péremption.
  - 🟡 **Jaune :** Lot en attente (vendu dès épuisement du lot précédent).
  - 🔴 **Rouge :** Lot bloqué nécessitant approbation préalable du grossiste.
- **Moteur de calcul de marges temps réel :** Calcul automatique du prix d'achat/vente carton et unitaire par pièce, profit par carton et profit total estimé.
- **Prise de commande & Facturation POS Grossiste.**
- **Archivage automatique :** Déplacement automatique des lots à 0 stock vers l'historique.

### 3. `apps/retailer` (Espace Boutique & Caisse)
- **Catalogue d'approvisionnement :** Commande directe auprès des distributeurs agréés de la région.
- **Double stock Rayon ↔ Réserve :**
  - 🏪 **Rayon (Caisse) :** Suivi en temps réel des cartons et du nombre exact de pièces unitaires exposées.
  - 🏭 **Réserve (Entrepôt) :** Cartons stockés à l'arrière-boutique, transférables en un clic vers le rayon.
- **Ajustement du prix de vente unitaire :** Définition du prix de vente par pièce avec calcul dynamique de la marge nette.
- **Caisse enregistreuse (POS Comptoir) :** Vente au comptoir déduisant les pièces du rayon sans toucher au stock en réserve.

---

## 🛠️ Technologies Utilisées

- **Frontend :** React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Frameworks :** Next.js (Admin), Vite (Distributor & Retailer)
- **Desktop :** Electron (Support pour Distributor et Retailer)
- **Backend & Données :** Firebase (Cloud Firestore, Firebase Authentication, Cloud Storage)
- **Médias :** Cloudinary Image Upload

---

## 🚀 Installation & Démarrage

### Prérequis
- Node.js (v18+)
- npm ou yarn

### 1. Cloner le projet
```bash
git clone <URL_DU_DEPOT_GITHUB>
cd fin_______pro
```

### 2. Installer les dépendances
```bash
# Admin
cd apps/admin && npm install

# Distributeur
cd ../distributor && npm install

# Détaillant
cd ../retailer && npm install
```

### 3. Variables d'environnement
Configurer les clés Firebase et Cloudinary dans chaque application (`.env.local` basé sur la configuration Firebase).

### 4. Lancer les applications en développement
```bash
# Pour Admin :
npm run dev

# Pour Distributeur :
npm run dev

# Pour Commerçant / Détaillant :
npm run dev
```

---

## 📄 Licence
Propriétaire - Tous droits réservés.
