# Deployment Guide

This guide will help you deploy your invoice processing application with the backend on Railway and frontend on Vercel.

## 🚀 Quick Deployment Steps

### 1. Deploy Backend to Railway

1. **Create a Railway Account**: Go to [railway.app](https://railway.app) and sign up
2. **Create New Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Connect Repository**: Connect your GitHub repository
4. **Select Backend Directory**: Railway should auto-detect the Python app in the `/backend` folder
5. **Set Environment Variables** in Railway dashboard:
   ```bash
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   AWS_DEFAULT_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key_here
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
   PORT=8000
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```
6. **Deploy**: Railway will automatically deploy your backend
7. **Note the URL**: Copy your Railway app URL (e.g., `https://your-app.railway.app`)

### 2. Deploy Frontend to Vercel

1. **Create a Vercel Account**: Go to [vercel.com](https://vercel.com) and sign up
2. **Import Project**: Click "New Project" → Import from GitHub
3. **Select Repository**: Choose your repository
4. **Configure Project**:
   - Framework Preset: Next.js
   - Root Directory: `.` (leave as root)
5. **Set Environment Variables** in Vercel dashboard:
   ```bash
   PYTHON_API_URL=https://your-backend.railway.app
   ```
6. **Deploy**: Vercel will build and deploy your frontend
7. **Update Backend CORS**: Update the `FRONTEND_URL` in Railway with your Vercel URL

### 3. Update CORS Configuration

After both deployments:

1. Go to Railway dashboard
2. Update the `FRONTEND_URL` environment variable with your actual Vercel URL
3. Redeploy the backend service

## 🔧 Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
npm install
npm run dev
```

## 🌐 Environment Variables Summary

### Backend (Railway)

- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `AWS_DEFAULT_REGION` - AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `PORT` - Port number (Railway sets this automatically)
- `FRONTEND_URL` - Your Vercel frontend URL

### Frontend (Vercel)

- `PYTHON_API_URL` - Your Railway backend URL

## 🔄 Automatic Deployments

Both platforms support automatic deployments:

- **Railway**: Deploys backend on every push to main branch
- **Vercel**: Deploys frontend on every push to main branch

## 🐛 Troubleshooting

### CORS Issues

- Ensure `FRONTEND_URL` in Railway matches your Vercel domain exactly
- Check that both HTTP and HTTPS are handled correctly

### API Connection Issues

- Verify `PYTHON_API_URL` in Vercel points to your Railway backend
- Check Railway logs for backend errors
- Ensure Railway backend is healthy via `/health` endpoint

### Build Issues

- Check build logs in both Railway and Vercel dashboards
- Verify all dependencies are listed in `requirements.txt` and `package.json`

## 📋 Post-Deployment Checklist

- [ ] Backend deployed successfully on Railway
- [ ] Frontend deployed successfully on Vercel
- [ ] Environment variables set correctly on both platforms
- [ ] CORS configured with correct frontend URL
- [ ] Test file upload functionality
- [ ] Check API health endpoint works
- [ ] Verify invoice extraction works end-to-end

## 🔗 Useful Links

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
