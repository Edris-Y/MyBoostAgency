/* publier.js - Version Google Gemini + Images Unsplash */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const slugify = require('slugify');
const fetch = require('node-fetch'); // Pour parler à Unsplash et télécharger

// --- CONFIGURATION ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
});
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

// --- FONCTION UTILITAIRE : TÉLÉCHARGER UNE IMAGE ---
async function downloadImage(url, filepath) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    fs.writeFileSync(filepath, buffer);
    console.log(`📸 Image téléchargée : ${filepath}`);
}

const subject = process.argv[2];

if (!subject) {
    console.error("❌ Erreur : Il manque le sujet !");
    console.log("Usage : node publier \"Mon Sujet d'Article\"");
    process.exit(1);
}

console.log(`🤖 Démarrage de la mission : "${subject}"...`);

async function generateArticle() {
    try {
        // 1. Demander le texte ET le mot-clé d'image à Google Gemini
        console.log("🧠 Google Gemini rédige l'article...");
        const prompt = `
        Tu es un expert SEO et Développeur Web Senior chez BoostAgency.
        Rédige un article de blog long, expert et optimisé pour la conversion sur le sujet : "${subject}".
        
        FORMAT DE SORTIE OBLIGATOIRE (JSON) :
        {
            "title": "Titre accrocheur (H1)",
            "description": "Meta description pour Google (max 160 chars)",
            "category": "Une catégorie courte (ex: Tech, Business, SEO)",
            "imageSearchKeyword": "Un mot-clé court EN ANGLAIS pour chercher une photo illustrative sur Unsplash (ex: 'laptop coding office')",
            "intro": "Une introduction percutante (2-3 phrases)",
            "htmlContent": "Le corps de l'article en HTML pur (sans balises <html>, <head> ou <body>). Utilise uniquement <h2>, <p>, <ul>, <li>, <strong>. À la fin, inclus OBLIGATOIREMENT cette div exacte : <div class='cta-box'><h3>Un titre d'appel à l'action</h3><p>Une phrase courte pour convaincre</p><a href='../index.html#contact' class='btn btn-primary'>Texte du bouton</a></div>"
        }`;

        const result = await model.generateContent(prompt);
        const articleData = JSON.parse(result.response.text());
        
        const slug = slugify(articleData.title, { lower: true, strict: true });
        const fileName = slug + '.html';
        const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

        // 2. Gérer l'image avec Unsplash
        console.log(`🔎 Recherche d'image sur Unsplash pour : "${articleData.imageSearchKeyword}"...`);
        const unsplashResponse = await fetch(`https://api.unsplash.com/search/photos?query=${articleData.imageSearchKeyword}&per_page=1&client_id=${UNSPLASH_KEY}`);
        const unsplashData = await unsplashResponse.json();
        
        let imageHtml = '';
        // Si on trouve une image
        if (unsplashData.results && unsplashData.results.length > 0) {
            const imageUrl = unsplashData.results[0].urls.regular;
            // Créer le dossier assets/blog si inexistant
            const imgDir = path.join('assets', 'blog');
            if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
            
            const imageName = slug + '.jpg';
            const localImagePath = path.join(imgDir, imageName);
            
            // Télécharger l'image
            await downloadImage(imageUrl, localImagePath);
            
            // Préparer le HTML de l'image pour l'article (chemin relatif ../assets/blog/...)
            imageHtml = `<img src="../assets/blog/${imageName}" alt="${articleData.title}" style="width:100%; border-radius:24px; margin-bottom:40px; aspect-ratio: 16/9; object-fit: cover;">`;
        } else {
             console.log("⚠️ Aucune image trouvée sur Unsplash, l'article sera sans image.");
        }


        // 3. Création du fichier HTML de l'article
        console.log("📄 Création du fichier HTML...");
        const htmlTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${articleData.title} | BoostAgency</title>
    <meta name="description" content="${articleData.description}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../styles.css">
    <style>
        .article-header { padding-top: 140px; text-align: center; padding-bottom: 40px; }
        .meta-info { color: var(--secondary); font-weight: 600; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 20px; }
        .content-wrapper { max-width: 800px; margin: 0 auto; padding-bottom: 100px; padding-left: 20px; padding-right: 20px; }
        .article-body { background: var(--bg-card); padding: 50px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); }
        .article-body h2 { font-size: 1.8rem; margin-top: 40px; margin-bottom: 20px; color: white; }
        .article-body p { font-size: 1.05rem; line-height: 1.8; color: #cbd5e1; margin-bottom: 25px; }
        .article-body ul { margin-bottom: 25px; padding-left: 20px; color: #cbd5e1; }
        .article-body li { margin-bottom: 10px; list-style-type: disc; }
        .cta-box { background: rgba(37, 99, 235, 0.1); border: 1px solid var(--primary); padding: 30px; border-radius: 15px; margin: 40px 0; text-align: center; }
        .cta-box h3 { color: white; margin-bottom: 10px; font-size: 1.4rem; }
        @media (max-width: 768px) { .article-body { padding: 30px 20px; } }
    </style>
</head>
<body>
    <header>
        <a href="../index.html" class="logo"><img src="../assets/Logo Boost Agency Left White.png" alt="Logo"></a>
        <nav><ul><li><a href="../blog.html">Retour au Blog</a></li><li><a href="https://calendly.com/boostagency32" class="btn btn-primary contact-nav-btn">Je veux mon site !</a></li></ul></nav>
    </header>
    <article>
        <div class="article-header">
            <div class="meta-info">${articleData.category} • ${date}</div>
            <h1 class="text-gradient" style="font-size: 2.5rem; max-width: 900px; margin: 0 auto;">${articleData.title}</h1>
        </div>
        <div class="content-wrapper">
            ${imageHtml}
            <div class="article-body">${articleData.htmlContent}</div>
        </div>
    </article>
    <footer><div style="text-align:center; padding:40px; color:#666">&copy; 2026 BoostAgency</div></footer>
</body>
</html>`;

        if (!fs.existsSync('blog')) fs.mkdirSync('blog');
        fs.writeFileSync(path.join('blog', fileName), htmlTemplate);

        // 4. Injection dans blog.html
        console.log("🔗 Mise à jour de la liste des articles...");
        let blogIndex = fs.readFileSync('blog.html', 'utf8');
        const newCard = `
            <article class="blog-card">
                <div>
                    <span class="category-badge">${articleData.category}</span>
                    <h3>${articleData.title}</h3>
                    <p>${articleData.intro}</p>
                </div>
                <div class="read-more">Lire l'article <i class="fas fa-arrow-right"></i></div>
                <a href="blog/${fileName}" class="card-link-overlay"></a>
            </article>
        `;
        
        if (blogIndex.includes('<div class="blog-grid">')) {
             blogIndex = blogIndex.replace('<div class="blog-grid">', `<div class="blog-grid">\n${newCard}`);
             fs.writeFileSync('blog.html', blogIndex);
        } else {
            console.log("⚠️ Attention : <div class='blog-grid'> non trouvé dans blog.html.");
        }

        // 5. Mise à jour Sitemap
        console.log("🗺️ Mise à jour du Sitemap...");
        let sitemap = fs.readFileSync('sitemap.xml', 'utf8');
        const sitemapEntry = `
   <url>
      <loc>https://myboostagency.fr/blog/${fileName}</loc>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>monthly</changefreq>
   </url>`;
        sitemap = sitemap.replace('</urlset>', `${sitemapEntry}\n</urlset>`);
        fs.writeFileSync('sitemap.xml', sitemap);

        console.log(`\n🚀 MISSION ACCOMPLIE !`);
        console.log(`👉 Article créé : blog/${fileName}`);
        if(imageHtml) console.log(`👉 Image téléchargée dans : assets/blog/`);
        console.log("\nPour publier, lancez :");
        console.log("git add . && git commit -m 'Nouvel article avec image' && git push");

    } catch (error) {
        console.error("🔥 ERREUR FATALE :", error);
    }
}

generateArticle();