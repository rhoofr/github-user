import React, { useState, useEffect } from 'react';
import mockUser from './mockData.js/mockUser';
import mockRepos from './mockData.js/mockRepos';
import mockFollowers from './mockData.js/mockFollowers';
import axios from 'axios';

const rootUrl = 'https://api.github.com';

const GithubContext = React.createContext();

// Provider, Consumer
const GithubProvider = ({ children }) => {
  const [githubUser, setGithubUser] = useState(mockUser);
  const [repos, setRepos] = useState(mockRepos);
  const [followers, setFollowers] = useState(mockFollowers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ show: false, msg: '' });
  const [limit, setLimit] = useState(0);
  const [remaining, setRemaining] = useState(0);

  // Search github for user
  const searchGithubUser = async user => {
    let response;
    toggleError();
    setLoading(true);
    try {
      response = await axios.get(`${rootUrl}/users/${user}`);
      const { data } = response;
      if (response) {
        setGithubUser(data);
        const { repos_url, followers_url } = data;

        await Promise.allSettled([
          axios(`${repos_url}?per_page=100`),
          axios(`${followers_url}?per_page=100`)
        ])
          .then(results => {
            const [repos, followers] = results;
            const status = 'fulfilled';
            if (repos.status === status) {
              setRepos(repos.value.data);
            } else {
              setRepos([]);
            }
            if (followers.status === status) {
              setFollowers(followers.value.data);
            } else {
              setFollowers([]);
            }
          })
          .catch(err => console.log(err));
      } else {
        toggleError(true, 'no results for that username!');
      }
    } catch (error) {
      console.error(error.message);
      toggleError(true, error.message);
    }
    checkRequests();
    setLoading(false);
  };

  // check rate
  const checkRequests = async () => {
    let response;
    setLoading(true);
    try {
      response = await axios.get(`${rootUrl}/rate_limit`);
    } catch (error) {
      console.error(error);
    }
    const { data } = response;

    if (data) {
      let {
        rate: { remaining, limit }
      } = data;

      // const { limit, remaining } = response.data.rate;
      if (remaining === 0) {
        // throw an error
        toggleError(true, 'Sorry, you have exceeded your hourly rate limit!');
      }
      setLimit(limit);
      setRemaining(remaining);
    }
    setLoading(false);
  };

  const toggleError = (show = false, msg = '') => {
    setError({ show, msg });
  };

  useEffect(() => {
    checkRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect(() => {
  //   checkRequests();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [githubUser, repos, followers]);

  return (
    <GithubContext.Provider
      value={{
        githubUser,
        repos,
        followers,
        limit,
        remaining,
        error,
        searchGithubUser,
        loading
      }}
    >
      {children}
    </GithubContext.Provider>
  );
};

export { GithubProvider, GithubContext };
