import express from 'express';
import cors from 'cors';
import multer from 'multer';
import  pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import resumeRosterPrompt, { Language } from './prompt';


const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());



const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 10MB
});                    

const genAi  = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');


app.get('/', (req, res) => {
    res.send('Resume Roaster Server is running!');
});

app.post('/upload', upload.single('resume'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const parseResume = await pdf(req.file.buffer);
        const resumeText = parseResume.text;

        if(!resumeText || resumeText.trim().length === 0 ) {
            return res.status(400).send('Resume is empty or not readable.');
        }
        
        const model = await genAi.getGenerativeModel({model: 'gemini-1.5-flash'});

        const language = req.body.language  || Language.ENGLISH; // Default to English if not provided
        const response = await model.generateContent(resumeRosterPrompt(resumeText ,language))
        const roastResponse  = response.response.text();

        res.json({ 
            roast :roastResponse,
            filename :req.file.originalname, 
        });



    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).send('Error processing file.');
    }
}); 

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});