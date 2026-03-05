import { useEffect, useState } from "react";
import Search from "./components/Search";
import { MoonLoader } from "react-spinners";
import MovieCard from "./components/MovieCard";
import { useDebounce } from "react-use";
// 1. Import your supabase client
import { supabase } from "./supabaseClient"; 

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [movieList, setMovieList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // 2. State for trending movies
  const [trendingMovies, setTrendingMovies] = useState([]);

  useDebounce(() => {
    setDebouncedSearchTerm(searchTerm);
  }, 500, [searchTerm]);

  // 3. Function to fetch trending movies from Supabase
  const loadTrendingMovies = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_movies')
        .select('*')
        .order('count', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTrendingMovies(data || []);
    } catch (error) {
      console.error(`Error fetching trending movies: ${error.message}`);
    }
  };

  const fetchMovies = async (query = "") => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;

      const response = await fetch(endpoint, API_OPTIONS);
      
      if (!response.ok) throw new Error("Failed to fetch movies");

      const data = await response.json();
      setMovieList(data.results || []);

      // 4. Update the trending count in Supabase if a search was performed
      if (query && data.results.length > 0) {
        await supabase.rpc('update_trending_count', {
          s_term: query,
          m_id: data.results[0].id,
          p_url: data.results[0].poster_path
        });
        
        // Refresh the trending list after updating
        loadTrendingMovies();
      }
    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage("Failed to fetch movies. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // 5. Initial load of trending movies
  useEffect(() => {
    loadTrendingMovies();
  }, []);

  return (
    <main>
      <div className="pattern">
        <div className="wrapper">
          <header>
            <img src="./hero.png" alt="Hero Banner" />
            <h1>
              Find <span className="text-gradient">Movies</span> You'll Enjoy Without The Hassle
            </h1>
            <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </header>

          {/* 6. Display Trending Movies Section */}
          {trendingMovies.length > 0 && (
            <section className="trending">
              <h2>Trending Movies</h2>
              <ul>
                {trendingMovies.map((movie, index) => (
                  <li key={movie.id}>
                    <p>{index + 1}</p>
                    <img 
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_url}`} 
                      alt={movie.searchTerm} 
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="all-movies">
            <h2 className="mt-10">All Movies</h2>
            {isLoading ? (
              <MoonLoader color="#f7f7f7" />
            ) : errorMessage ? (
              <p className="text-red-500">{errorMessage}</p>
            ) : (
              <ul>
                {movieList.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default App;