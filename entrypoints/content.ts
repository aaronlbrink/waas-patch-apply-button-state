import DOMPurify from 'dompurify';
import { appliedJobs } from "./utils/storage";

export default defineContentScript({
  matches: ['*://*.workatastartup.com/*', 'http://localhost/*'],
  main: async () => {
    console.log("started WaaS Extension")
    const url = new URL(window.location.href);
    if (url.pathname.match(/^\/jobs\/\d+$/)) {
      await handleJobListingPage(url);
    } else if (url.pathname.match(/^\/companies$/)) {
      await handleCompaniesPage(url)
    } else if (url.hostname.includes("localhost")) {
      console.log("on localhost")
      const jobIdsInLocalStorage = await appliedJobs.getValue();
      console.log(`local storage jobs=${jobIdsInLocalStorage}`);
      const table = document.getElementById('best-ordered-table');
      if (table) {
        const headerRow = table.querySelector('thead tr');
        if (headerRow) {
          const newHeaderCell = document.createElement('th');
          newHeaderCell.textContent = 'Applied?'; // Set the header text
          headerRow.prepend(DOMPurify.sanitize(newHeaderCell));
        }
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          if (row.parentNode?.nodeName !== "THEAD") {
            const newCell = document.createElement('td');
            const rowJobId = row.dataset.jobId;
            console.log(`rowJobId=${rowJobId}`);
            let applied = ''
            if (rowJobId && !isNaN(Number(rowJobId))) {
              applied = String(jobIdsInLocalStorage.includes(Number(rowJobId)))
            }
            console.log(`${applied}`);
            newCell.textContent = DOMPurify.sanitize(applied);
            if (applied === "true") {
              row.style.backgroundColor = "#c1ffc2";
            }

            row.prepend(DOMPurify.sanitize(newCell));
          }
        });
      }

    }
  }
});

async function addJobToStorageWithoutDuplicates(jobIdToAdd: number) {
  const appliedJobsStored = await appliedJobs.getValue();
  const foundJob = appliedJobsStored.find(jobId => jobId === jobIdToAdd);
  if (!foundJob) {
    await appliedJobs.setValue([...appliedJobsStored, jobIdToAdd]);
    console.log("Added job to storage! jobId=", jobIdToAdd)
  }

}


async function handleJobListingPage(url: URL) {
  const urlEndValue = url.pathname.split('/').pop();
  if (!urlEndValue && Number(urlEndValue) && typeof Number(urlEndValue) === "number") return console.error("WaaS Extension: URL's end value was not a number, found", urlEndValue)
  const jobId = Number(urlEndValue);

  console.log('Job listing page');

  // (1) If a job page is visited and the grey "Applied" button is shown, import this job to local storage
  const appliedHrefs = document.querySelectorAll('a');
  const appliedHref = Array.from(appliedHrefs).find(btn => {
    if (btn.textContent) return btn.textContent.trim() === "Applied";
    return false;
  });
  if (appliedHref) {
    await addJobToStorageWithoutDuplicates(jobId)
  }

  // (2) Add jobId to local storage when user press the "Send" button
  const observer = new MutationObserver(async (a) => {

    const buttons = document.querySelectorAll('button');
    const button = Array.from(buttons).find(btn => {
      if (btn.textContent) return btn.textContent.trim() === "Send";
      return false;
    });

    if (button) {
      button.addEventListener('click', async () => {
        console.log('Send button clicked');
        await addJobToStorageWithoutDuplicates(jobId)
      })
    }
  });
  const bodySelector = document.querySelector("body");
  if (bodySelector) {
    observer.observe(bodySelector, {
      subtree: true,
      childList: true,
    });
  }

}

async function handleCompaniesPage(url: URL) {
  const observer = new MutationObserver(async (a) => {
    const jobNameAnchorNodes = document.querySelectorAll('a')
    const buttons = Array.from(jobNameAnchorNodes).filter(btn => {
      if (btn.textContent) return btn.textContent.trim() === "View job";
      return false;
    });
    buttons.forEach(async elem => {
      const jobId = elem.href.split('/').pop();
      if (jobId && typeof Number(jobId) === "number") {
        const storedJobIds = await appliedJobs.getValue();
        if (storedJobIds.includes(Number(jobId))) {
          elem.textContent = "Applied already!";
          elem.classList.remove('bg-brand');
          elem.classList.add('bg-gray-400');
        }
      }
    })
  })
  const bodySelector = document.querySelector("body");
  if (bodySelector) {
    observer.observe(bodySelector, {
      subtree: true,
      childList: true,
    });
  }

}
