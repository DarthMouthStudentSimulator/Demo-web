# LLM Agent-Based Simulation of Student Activities and Mental Health

[![Project Website](https://img.shields.io/badge/Project%20Website-Visit%20Site-blue)](https://darthmouthstudentsimulator.github.io/)
[![Paper](https://img.shields.io/badge/Paper-arXiv-red)](https://arxiv.org/abs/2508.02679)


## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DarthMouthStudentSimulator/Demo-web.git
   cd Demo
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies:**
   ```bash
   cd web
   npm install
   cd ..
   ```

4. **Set up your Gemini API key:**
   
   You have two options:

   **Option A: Environment Variables (Recommended)**
   ```bash
   # Create a .env file in the root directory
   echo "GEMINI_API_KEY=your_actual_gemini_api_key_here" > .env
   ```

   **Option B: Enter API key in the web interface**
   - Start the application without setting environment variables
   - Enter your API key directly in the web interface

5. **Get your Gemini API key:**
   - Visit [Google AI Studio](https://ai.google.dev/gemini-api/docs/models#gemini-2.0-flash)
   - Sign in with your Google account
   - Create a new API key
   - Copy the key and add it to your `.env` file or enter it in the web interface

### Running the Application

1. **Start the API Server:**
   ```bash
   python -m scripts.api_server
   ```
   The API server will be available at `http://127.0.0.1:8089`

2. **Start the Web Frontend (in a new terminal):**
   ```bash
   cd web
   npm run dev
   ```
   The web application will be available at `http://localhost:5173`

3. **Access the Application:**
   - Open your browser and navigate to `http://localhost:5173`
   - Select a student from the available users (u01, u02, u04, etc.)
   - Explore the dashboard with student activities, mental health data, and chat functionality

## 🎯 Features

- **Student Dashboard**: Visualize student activities, locations, and mental health patterns
- **LLM Chat Interface**: Interact with AI agents representing students with realistic personalities
- **Mental Health Tracking**: Monitor sleep, social activities, and stress levels over time
- **Personality-Based Simulation**: Agents behave according to Big Five personality traits
- **Temporal Analysis**: Explore data across different weeks and days of the semester

## 📊 Data Structure

The project uses data from the StudentLife Dataset with the following structure:

- **User directories** (`u01/`, `u02/`, etc.): Contain weekly activity data and status files
- **Weekly data**: `data_per_week{X}.csv` files with location and activity information
- **Status files**: `sleep_week_.csv`, `social_week_.csv`, `stress_week_.csv`
- **Emotion history**: `{user_id}_emotion_status_history.jsonl` files
- **Personality data**: `result_pre_bigfive.csv` with Big Five personality scores


## 📚 Citation

If you use this work in your research, please cite our paper:

```bibtex
@misc{2508.02679,
Author = {Wayupuk Sommuang and Kun Kerdthaisong and Pasin Buakhaw and Aslan B. Wong and Nutchanon Yongsatianchot},
Title = {LLM Agent-Based Simulation of Student Activities and Mental Health Using Smartphone Sensing Data},
Year = {2025},
Eprint = {arXiv:2508.02679},
}
```

## 🔗 Links

- **Project Website**: [https://darthmouthstudentsimulator.github.io/](https://darthmouthstudentsimulator.github.io/)
- **Paper**: [arXiv:2508.02679](https://arxiv.org/abs/2508.02679)
- **Conference**: UbiComp / ISWC 2025


