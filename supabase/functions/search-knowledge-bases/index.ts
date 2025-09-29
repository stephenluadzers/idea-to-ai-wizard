import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
  type: 'dataset' | 'api' | 'documentation' | 'repository';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, domain } = await req.json();
    console.log(`Searching for knowledge bases: query="${query}", domain="${domain}"`);

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: SearchResult[] = [];

    // Search Kaggle datasets
    const kaggleQuery = `site:kaggle.com/datasets ${query} ${domain || ''}`;
    console.log('Searching Kaggle datasets...');
    
    try {
      const kaggleResponse = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${Deno.env.get('GOOGLE_SEARCH_API_KEY')}&cx=${Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')}&q=${encodeURIComponent(kaggleQuery)}&num=5`
      );
      
      if (kaggleResponse.ok) {
        const kaggleData = await kaggleResponse.json();
        if (kaggleData.items) {
          kaggleData.items.forEach((item: any) => {
            results.push({
              title: item.title,
              url: item.link,
              description: item.snippet || '',
              source: 'Kaggle',
              type: 'dataset'
            });
          });
        }
      }
    } catch (error) {
      console.error('Error searching Kaggle:', error);
    }

    // Search GitHub repositories
    const githubQuery = `site:github.com ${query} ${domain || ''} dataset OR data OR API`;
    console.log('Searching GitHub repositories...');
    
    try {
      const githubResponse = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${Deno.env.get('GOOGLE_SEARCH_API_KEY')}&cx=${Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')}&q=${encodeURIComponent(githubQuery)}&num=5`
      );
      
      if (githubResponse.ok) {
        const githubData = await githubResponse.json();
        if (githubData.items) {
          githubData.items.forEach((item: any) => {
            results.push({
              title: item.title,
              url: item.link,
              description: item.snippet || '',
              source: 'GitHub',
              type: 'repository'
            });
          });
        }
      }
    } catch (error) {
      console.error('Error searching GitHub:', error);
    }

    // Search for APIs and documentation
    const apiQuery = `${query} ${domain || ''} API documentation OR "public API" OR "open data"`;
    console.log('Searching for APIs and documentation...');
    
    try {
      const apiResponse = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${Deno.env.get('GOOGLE_SEARCH_API_KEY')}&cx=${Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')}&q=${encodeURIComponent(apiQuery)}&num=5`
      );
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        if (apiData.items) {
          apiData.items.forEach((item: any) => {
            // Determine type based on URL and content
            let type: 'api' | 'documentation' = 'documentation';
            if (item.link.includes('api') || item.snippet.toLowerCase().includes('api')) {
              type = 'api';
            }
            
            results.push({
              title: item.title,
              url: item.link,
              description: item.snippet || '',
              source: 'Web',
              type: type
            });
          });
        }
      }
    } catch (error) {
      console.error('Error searching APIs:', error);
    }

    // If no API keys are available, provide fallback results
    if (results.length === 0) {
      console.log('No API keys available, providing fallback results');
      results.push(
        {
          title: `${domain || 'Data'} Datasets on Kaggle`,
          url: `https://www.kaggle.com/search?q=${encodeURIComponent(query)}`,
          description: `Search for ${query} datasets on Kaggle, the world's largest community of data scientists and machine learning practitioners.`,
          source: 'Kaggle',
          type: 'dataset'
        },
        {
          title: `${domain || 'Open'} Data Repositories`,
          url: `https://github.com/search?q=${encodeURIComponent(query + ' dataset')}`,
          description: `Find open source datasets and repositories related to ${query} on GitHub.`,
          source: 'GitHub',
          type: 'repository'
        },
        {
          title: `${domain || 'Public'} APIs`,
          url: `https://rapidapi.com/search/${encodeURIComponent(query)}`,
          description: `Discover public APIs related to ${query} for integration into your applications.`,
          source: 'RapidAPI',
          type: 'api'
        },
        {
          title: `Google Dataset Search`,
          url: `https://datasetsearch.research.google.com/search?src=0&query=${encodeURIComponent(query)}`,
          description: `Search for datasets across the web using Google's specialized dataset search engine.`,
          source: 'Google',
          type: 'dataset'
        }
      );
    }

    console.log(`Found ${results.length} knowledge base results`);

    return new Response(
      JSON.stringify({ results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in search-knowledge-bases function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});