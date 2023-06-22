// Airtable details
const baseId = 'appHU5JBCn1bkFUZZ';
const personalToken = 'patJ3d1Asu5Eu3h6s.2c9ed083dd0259b2b4ac05a4e7ef6d8b4034ce15163c026f8cad812972d58f65';
const tableName = 'Articles';

// Function to render all the tags
function renderTags(records) {
  const tagsContainer = document.querySelector('.filter-tags');

  const tags = new Set();
  records.forEach((record) => {
    record.fields.Tags.forEach((tag) => {
      tags.add(tag);
    });
  });

  tagsContainer.innerHTML = '';

  tags.forEach((tag) => {
    const tagElement = document.createElement('span');
    tagElement.classList.add('tag');
    tagElement.textContent = tag;
    tagElement.addEventListener('click', () => {
      tagElement.classList.toggle('selected');
      filterArticles();
    });
    tagsContainer.appendChild(tagElement);
  });
}

// Function to render the list of articles
function renderArticles(records) {
  const articlesList = document.querySelector('.articles-listing-section');

  const now = new Date(); // Current date and time

  // Sort the records based on creation date
  records.sort((a, b) => {
    const dateA = new Date(a.fields.Created);
    const dateB = new Date(b.fields.Created);

    // Compare the dates
    if (isWithinLastDay(dateA, now) && !isWithinLastDay(dateB, now)) {
      return -1; // a is within the last day and b is not, a should come first
    } else if (!isWithinLastDay(dateA, now) && isWithinLastDay(dateB, now)) {
      return 1; // a is not within the last day and b is, b should come first
    } else {
      // Both dates are within the last day or both are not, sort by vote count
      return b.fields.Votes - a.fields.Votes;
    }
  });

  articlesList.innerHTML = ''; // Clear existing articles

  records.forEach((record) => {
    const articleHTML = createArticleHTML(record);
    articlesList.appendChild(articleHTML);
  });
}

// Function to check if a date is within the last day
function isWithinLastDay(date, now) {
  const oneDay = 24 * 60 * 60 * 1000; // One day in milliseconds
  return now - date <= oneDay;
}

// Function to filter articles by tag
function filterArticles() {
  const selectedTags = document.querySelectorAll('.filter-tags .tag.selected');
  const selectedTagIds = Array.from(selectedTags).map((tag) => tag.textContent);

  const articles = document.querySelectorAll('.article');

  articles.forEach((article) => {
    const articleTags = Array.from(article.querySelectorAll('.tags .tag')).map((tag) => tag.textContent);

    if (selectedTagIds.length === 0 || selectedTagIds.every((tagId) => articleTags.includes(tagId))) {
      article.style.display = 'grid';
    } else {
      article.style.display = 'none';
    }
  });
}


// Function to create the HTML structure for each article
function createArticleHTML(article) {
  const listItem = document.createElement('li');
  listItem.classList.add('article');

  const voteColumn = document.createElement('div');
  voteColumn.classList.add('column');

  const votes = document.createElement('span');
  votes.classList.add('votes');
  votes.textContent = article.fields.Votes;
  voteColumn.appendChild(votes);
  listItem.appendChild(voteColumn);

  const detailsColumn = document.createElement('div');
  detailsColumn.classList.add('column');

  const title = document.createElement('h3');
  title.innerHTML = `<a href="${article.fields.URL}" target="_blank">${article.fields.Title}</a>`;
  detailsColumn.appendChild(title);

  const description = document.createElement('p');
  description.textContent = article.fields.Description;
  detailsColumn.appendChild(description);

  const tags = document.createElement('div');
  tags.classList.add('tags');
  article.fields.Tags.forEach((tag) => {
    const tagElement = document.createElement('span');
    tagElement.classList.add('tag');
    tagElement.textContent = tag;
    tags.appendChild(tagElement);
    tags.appendChild(document.createTextNode(' ')); // Add space between tags
  });
  detailsColumn.appendChild(tags);

  const addedBy = document.createElement('span');
  addedBy.classList.add('added-by');

  const addedByText = document.createElement('span');
  addedByText.textContent = 'Added by ';
  addedBy.appendChild(addedByText);

  const addedByName = document.createElement('strong');
  addedByName.textContent = article.fields["Added by"];
  addedBy.appendChild(addedByName);

  detailsColumn.appendChild(addedBy);

  listItem.appendChild(detailsColumn);

  // Add event listener to handle vote click
  votes.addEventListener('click', () => {
    const currentVotes = article.fields.Votes || 0;
    const updatedVotes = currentVotes + 1;
    votes.textContent = updatedVotes;
    updateVoteCount(article.id, updatedVotes)
      .catch((error) => {
        console.error('Error updating vote count:', error);
      });
  });

  return listItem;
}

// Event listener to the window's DOMContentLoaded event to initialize the filtering when the page is loaded.
window.addEventListener('DOMContentLoaded', () => {
  // Fetch the data from Airtable and render articles
  fetch(`https://api.airtable.com/v0/${baseId}/${tableName}?view=Grid%20view`, {
    headers: {
      'Authorization': `Bearer ${personalToken}`
    }
  })
    .then((response) => response.json())
    .then((data) => {
      const records = data.records;
      renderArticles(records);
      renderTags(records);
      filterArticles(); // Initial filter
    })
    .catch((error) => {
      console.error('Error fetching data from Airtable:', error);
    });
});


// Function to update the vote count in Airtable
async function updateVoteCount(recordId, voteCount) {
  const url = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;
  const body = JSON.stringify({
    fields: {
      Votes: voteCount
    }
  });
  const headers = {
    'Authorization': `Bearer ${personalToken}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: headers,
      body: body
    });
    if (!response.ok) {
      throw new Error('Vote count update failed');
    }
  } catch (error) {
    throw new Error('Error updating vote count:', error);
  }
}

// Function to create a new record in Airtable when adding an article
async function createArticleRecord(name, url, title, description, tags) {
  try {
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${personalToken}`,
      },
      body: JSON.stringify({
        fields: {
          'Added by': name,
          URL: url,
          Title: title,
          Description: description,
          Tags: tags,
          Votes: 1,
          Source: 'Website visitor',
        },
      }),
    });

    if (response.ok) {
      // Close the modal
      const modal = document.getElementById('add-article-modal');
      modal.style.display = 'none';

      // Show success message
      alert('The article was added successfully. Know that this would be greatly appreciated by someone out there :)');

      // Refresh the homepage
      window.location.reload();
    } else {
      alert('Error submitting article. Please try again.');
    }
  } catch (error) {
    console.error('Error submitting article:', error);
    alert('Error submitting article. Please try again.');
  }
}
