# MedBrief AI - Full Picture of Patients

An AI-powered medical application that helps doctors prepare in advance by providing comprehensive clinical summaries from patient reports, prescriptions, and symptoms.

## 🚀 Features

- **AI-Powered Medical Summaries**: Generate comprehensive clinical summaries from patient data
- **Patient Management**: Complete patient profile and consultation management system
- **Doctor Dashboard**: Advanced analytics and insights for healthcare providers
- **Secure Chat System**: HIPAA-compliant consultation chat between doctors and patients
- **File Processing**: Upload and analyze medical reports, prescriptions, and images
- **Responsive Design**: Modern, mobile-first interface built with React and Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database, Auth, Storage, Edge Functions)
- **Icons**: Lucide React
- **Charts**: Recharts
- **PDF Generation**: jsPDF
- **Date Handling**: React DatePicker

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/hiren-6/medbrief.git
cd medbrief
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

## 🌐 Deployment

### Netlify Deployment

This repository is configured for automatic deployment on Netlify:

1. **Connect to GitHub**: Link your Netlify account to this GitHub repository
2. **Build Settings**: 
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment Variables**: Add your Supabase credentials in Netlify dashboard
4. **Deploy**: Netlify will automatically build and deploy your app

### Manual Deployment
```bash
npm run build
# Upload the 'dist' folder to your hosting provider
```

## 📁 Project Structure

```
medbrief/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API and business logic
│   └── utils/         # Utility functions
├── supabase/          # Supabase configuration and functions
├── public/            # Static assets
└── dist/              # Build output (generated)
```

## 🔧 Configuration

### Vite Configuration
- Build output directory: `dist`
- React plugin enabled
- Source maps disabled for production

### Netlify Configuration
- SPA routing support with redirects
- Node.js 18 environment
- Automatic build and deployment

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Contact the development team

## 🔒 Security

- All sensitive data is handled securely through Supabase
- Environment variables are properly configured
- No sensitive information is committed to the repository

---

**Built with ❤️ for better healthcare**
