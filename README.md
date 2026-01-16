# TourneyRadar

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

## A website displaying upcoming chess tournaments worldwide on an interactive map

## About

TourneyRadar is a free, open-source platform that aggregates over-the-board chess tournaments from around the world. We automatically scrape tournament data from [Chess-Results.com](https://chess-results.com) and display them on an interactive map.

**Live Site:** [tourneyradar.com](https://tourneyradar.com)

## Features

- Interactive world map with tournament markers
- Search and filter tournaments by location, category, date
- 200+ tournaments from 16+ countries
- Automated daily scraping from Chess-Results
- Fully responsive design
- Dark/Light mode support

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + CSS Variables
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Maps:** [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/)
- **Scraping:** [Puppeteer](https://pptr.dev/)
- **Geocoding:** [Google Maps API](https://developers.google.com/maps)
- **Deployment:** [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Google Maps API key (for geocoding)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AnayDhawan/tourneyradar.git
cd tourneyradar
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Running the Scraper

To fetch new tournaments from Chess-Results:

```bash
npm run scrape
```

The scraper will:
- Skip tournaments already in your database
- Fetch up to 200 new tournaments
- Geocode locations using Google Maps API
- Save to Supabase

## Project Structure

```
tourneyradar/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Homepage with map
│   ├── tournaments/       # Tournament pages
│   ├── about/            # About page
│   └── contact/          # Contact page
├── components/            # React components
├── lib/                   # Utilities and configs
├── scripts/              
│   └── scrape.ts         # Tournament scraper
└── public/               # Static assets
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Data Sources

Tournament data is scraped from:
- [Chess-Results.com](https://chess-results.com) - The world's largest chess tournament database

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [echecsfrance](https://github.com/TheRealOwenRees/echecsfrance) - Inspiration for the project
- [Chess-Results.com](https://chess-results.com) - Tournament data source
- [Leaflet](https://leafletjs.com/) - Map library

---

Made by [Anay Dhawan](https://github.com/AnayDhawan)
