document.addEventListener('DOMContentLoaded', function() {
    // Update copyright year
    const currentYear = document.getElementById('current-year');
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    // Make all links open in a new tab
    makeAllLinksOpenInNewTab();

    // Set up MutationObserver to watch for dynamically added links
    setupLinkObserver();

    // Set up email copy
    setupEmailPopCopy();

    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // Load publications data from JSON file
    loadPublications();

    // Load updated time
    loadLastUpdated();

    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();

                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);

                if (targetSection) {
                    const navHeight = document.querySelector('.top-nav').offsetHeight;
                    const targetPosition = targetSection.offsetTop - navHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    navLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                }
            }
        });
    });

    // Update active nav link on scroll
    window.addEventListener('scroll', function() {
        let current = '';
        const sections = document.querySelectorAll('section[id]');
        const navHeight = document.querySelector('.top-nav').offsetHeight;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            if (pageYOffset >= sectionTop - navHeight - 100) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            const linkTarget = link.getAttribute('href').substring(1);
            if (linkTarget === current ||
                (current === 'homepage' && linkTarget === 'about') ||
                (current === 'about' && linkTarget === 'homepage')) {
                link.classList.add('active');
            }
        });
    });

    // Load news data
    let newsJsonPath = 'data/news.json';
    if (window.location.pathname.includes('/pages/')) {
        newsJsonPath = '../data/news.json';
    }

    fetch(newsJsonPath)
        .then(response => response.json())
        .then(data => {
            const latestNewsSection = document.getElementById('latest-news');
            if (latestNewsSection) {
                renderNewsItems(data.slice(0, 8), 'news-container');
            }

            const allNewsSection = document.getElementById('all-news');
            if (allNewsSection) {
                renderNewsItems(data, 'all-news-container');
            }
        })
        .catch(error => {
            console.error('Error loading news data:', error);
        });

    // Load honors data
    let honorsJsonPath = 'data/honors.json';
    if (window.location.pathname.includes('/pages/')) {
        honorsJsonPath = '../data/honors.json';
    }

    fetch(honorsJsonPath)
        .then(response => response.json())
        .then(data => {
            const honorsSection = document.getElementById('honors');
            if (honorsSection) {
                renderHonorsItems(data.slice(0, 8), 'honors-container');
            }

            const allHonorsSection = document.getElementById('all-honors');
            if (allHonorsSection) {
                renderHonorsItems(data, 'all-honors-container');
            }
        })
        .catch(error => {
            console.error('Error loading honors data:', error);
        });
});

// ============================================================
// Publications
// ============================================================

function loadPublications() {
    const allContainer = document.getElementById('all-publications-container');
    const legacyContainer = document.querySelector('.publications-list');

    if (!allContainer && !legacyContainer) {
        return;
    }

    fetch(getDataPath('publications.json'))
        .then(handleJsonResponse)
        .then(publications => {
            const container = allContainer || legacyContainer;
            if (container) {
                const initialFilter = getPublicationFilter();
                renderPublicationsWithFilter(container, publications, initialFilter);
                setupPublicationFilters(container, publications);
            }
        })
        .catch(error => {
            console.error('Error loading publications data:', error);
            const container = allContainer || legacyContainer;
            if (container) {
                container.innerHTML = '<p>Failed to load publications.</p>';
            }
        });
}

function getCategoryList(pub) {
    if (Array.isArray(pub.category)) return pub.category.map(c => String(c).toLowerCase());
    if (pub.category) return [String(pub.category).toLowerCase()];
    return [];
}

function renderPublicationsWithFilter(container, publications, filter) {
    const filterIndicator = document.getElementById('filter-indicator');

    let filtered = publications.slice();

    if (filter === 'llm') {
        filtered = filtered.filter(pub => getCategoryList(pub).includes('llm'));
        if (filterIndicator) {
            filterIndicator.textContent = '(LLM)';
        }
    } else if (filter === 'physics') {
        filtered = filtered.filter(pub => getCategoryList(pub).includes('physics'));
        if (filterIndicator) {
            filterIndicator.textContent = '(Physics)';
        }
    } else if (filterIndicator) {
        filterIndicator.textContent = '';
    }

    updateFilterButtons(filter);
    renderAllPublications(container, filtered);
}

function setupPublicationFilters(container, publications) {
    const filterButtons = document.querySelectorAll('.filter-link');
    if (!filterButtons.length) return;

    filterButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const f = this.getAttribute('data-filter') || 'all';
            renderPublicationsWithFilter(container, publications, f);
        });
    });
}

function renderAllPublications(container, publications) {
    container.innerHTML = '';

    if (!publications.length) {
        container.innerHTML = '<p class="empty-state">No publications found for this filter.</p>';
        return;
    }

    const grouped = new Map();

    publications
        .slice()
        .sort(compareAllPublications)
        .forEach(pub => {
            const yearLabel = getYearLabel(pub);
            if (!grouped.has(yearLabel)) {
                grouped.set(yearLabel, []);
            }
            grouped.get(yearLabel).push(pub);
        });

    Array.from(grouped.entries()).forEach(([year, items]) => {
        const group = document.createElement('div');
        group.className = 'pub-year-group';

        const header = document.createElement('h3');
        header.className = 'pub-year-header';
        header.textContent = year;
        group.appendChild(header);

        const list = document.createElement('ul');
        list.className = 'pub-list-ul';
        items.forEach(pub => {
            list.appendChild(createPublicationItem(pub));
        });

        group.appendChild(list);
        container.appendChild(group);
    });
}

function createPublicationItem(pub) {
    const item = document.createElement('li');
    item.className = 'pub-list-item with-thumbnail-expanded';

    const content = document.createElement('div');
    content.className = 'pub-content-wrapper';

    // --- Line 1: Title ---
    const line1 = document.createElement('div');
    line1.className = 'pub-line-1';

    const title = document.createElement('span');
    title.className = 'pub-title-text';
    title.textContent = pub.displayTitle || pub.title || 'Untitled Publication';
    line1.appendChild(title);
    content.appendChild(line1);

    // --- Line 2: Authors ---
    const line2 = document.createElement('div');
    line2.className = 'pub-line-2';
    line2.innerHTML = pub.authors || '';
    content.appendChild(line2);

    // --- Line 3: Venue + tag + badge + CCF rank ---
    const line3 = document.createElement('div');
    line3.className = 'pub-line-3';

    const venueFullName = getVenueFullName(pub.venue, pub.year);
    const venueShortName = getVenueShortName(pub.venue, pub.year);
    const venueText = venueFullName || pub.venue || 'Preprint';

    const venueNameSpan = document.createElement('span');
    venueNameSpan.textContent = venueText;
    line3.appendChild(venueNameSpan);

    if (shouldShowVenueTag(pub.venue, venueFullName, venueShortName)) {
        const venueTag = document.createElement('span');
        venueTag.className = 'pub-venue-tag pub-venue-inline-tag';
        venueTag.textContent = venueShortName;

        const lowerVenue = venueShortName.toLowerCase();
        if (lowerVenue.includes('under review') || lowerVenue.includes('preprint') || lowerVenue.includes('arxiv')) {
            venueTag.classList.add('tag-under-review');
        } else {
            venueTag.classList.add('tag-conference');
        }

        line3.appendChild(venueTag);
    }

    // Highlight badge (Oral/Spotlight)
    const badgeText = getHighlightBadge(pub.highlight);
    if (badgeText) {
        const badge = document.createElement('span');
        badge.className = 'pub-badge-highlight';
        badge.textContent = badgeText;
        line3.appendChild(badge);
    }

    // CCF Rank
    const ccfRank = getCCFRank(venueFullName, pub.venue);
    if (ccfRank) {
        const rankSpan = document.createElement('span');
        rankSpan.className = `ccf-rank ccf-${ccfRank.toLowerCase()}`;
        rankSpan.textContent = `(CCF-${ccfRank})`;
        line3.appendChild(rankSpan);
    }

    content.appendChild(line3);

    // --- Line 4: Tags / Buttons ---
    if (pub.tags && Array.isArray(pub.tags)) {
        const line4 = document.createElement('div');
        line4.className = 'pub-line-4';

        pub.tags.forEach(tag => {
            const label = tag.text === 'Paper' ? 'PDF' : (tag.text || 'Link');
            const usableLink = hasUsableLink(tag.link);

            const button = document.createElement(usableLink ? 'a' : 'span');
            button.className = 'pub-link-btn';
            button.textContent = label;

            if (usableLink) {
                button.href = normalizeAssetPath(tag.link);
                button.target = '_blank';
                button.rel = 'noopener noreferrer';
            } else {
                button.classList.add('is-placeholder');
                button.title = 'Replace "#" with a real link in data/publications.json';
            }

            line4.appendChild(button);
        });

        if (line4.children.length > 0) {
            content.appendChild(line4);
        }
    }

    item.appendChild(content);

    // --- Thumbnail ---
    if (pub.thumbnail) {
        const thumbBox = document.createElement('div');
        thumbBox.className = 'pub-thumbnail-box';

        const thumbImg = document.createElement('img');
        const preferredThumbnail = getPreferredThumbnail(pub.thumbnail);
        thumbImg.src = preferredThumbnail.primary;
        thumbImg.alt = `${pub.title || 'Publication'} preview`;
        thumbImg.loading = 'lazy';
        thumbImg.onerror = function() {
            if (this.src !== preferredThumbnail.fallback) {
                this.onerror = null;
                this.src = preferredThumbnail.fallback;
            }
        };

        thumbBox.appendChild(thumbImg);
        item.appendChild(thumbBox);
    }

    return item;
}

function compareAllPublications(a, b) {
    const yearA = getComparableYear(a);
    const yearB = getComparableYear(b);
    if (yearA !== yearB) {
        return yearB - yearA;
    }

    const orderA = a.featuredOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.featuredOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
        return orderA - orderB;
    }

    const acceptedA = String(a.type || '').toLowerCase() === 'accepted' ? 1 : 0;
    const acceptedB = String(b.type || '').toLowerCase() === 'accepted' ? 1 : 0;
    if (acceptedA !== acceptedB) {
        return acceptedB - acceptedA;
    }

    return String(a.title || '').localeCompare(String(b.title || ''));
}

function getComparableYear(pub) {
    const parsedYear = parseInt(pub.year, 10);
    if (!Number.isNaN(parsedYear)) {
        return parsedYear;
    }
    return String(pub.type || '').toLowerCase() === 'accepted' ? 0 : 9999;
}

function getYearLabel(pub) {
    const parsedYear = parseInt(pub.year, 10);
    if (!Number.isNaN(parsedYear)) {
        return String(parsedYear);
    }
    return 'Preprints / Under Review';
}

function getPublicationFilter() {
    const params = new URLSearchParams(window.location.search);
    return params.get('filter') || 'all';
}

function updateFilterButtons(filter) {
    document.querySelectorAll('.filter-link').forEach(link => {
        link.classList.remove('active');
    });

    const element = document.getElementById(`filter-${filter}`) || document.getElementById('filter-all');
    if (element) {
        element.classList.add('active');
    }
}

function getHighlightBadge(highlightText) {
    const text = String(highlightText || '').toLowerCase();
    if (text.includes('oral')) {
        return 'Oral';
    }
    if (text.includes('spotlight')) {
        return 'Spotlight';
    }
    return '';
}

function getPreferredThumbnail(thumbnailPath) {
    const lastSlash = thumbnailPath.lastIndexOf('/');
    if (lastSlash === -1) {
        const normalized = normalizeAssetPath(thumbnailPath);
        return { primary: normalized, fallback: normalized };
    }

    const directory = thumbnailPath.substring(0, lastSlash);
    return {
        primary: normalizeAssetPath(`${directory}/demo.gif`),
        fallback: normalizeAssetPath(thumbnailPath)
    };
}

function shouldShowVenueTag(venueStr, fullVenueName, venueShort) {
    if (!venueShort) {
        return false;
    }

    const shortLower = venueShort.toLowerCase().trim();
    const fullLower = String(fullVenueName || '').toLowerCase().trim();

    if (!fullLower) {
        return false;
    }

    if (shortLower === fullLower && (shortLower.includes('preprint') || shortLower.includes('arxiv'))) {
        return false;
    }

    if (venueStr && venueStr.toLowerCase().includes('under review')) {
        return false;
    }

    return true;
}

// ============================================================
// Venue name resolution (merged: new template + astronomy journals)
// ============================================================

function getVenueShortName(venueStr, year) {
    if (!venueStr) {
        return 'Preprint';
    }

    let revisionSuffix = '';
    if (venueStr.toLowerCase().includes('major revision')) {
        revisionSuffix = ', Major';
    } else if (venueStr.toLowerCase().includes('minor revision')) {
        revisionSuffix = ', Minor';
    }

    let s = venueStr.replace(/\d{4}/g, '').trim();
    let suffix = '';

    const conferences = ['NeurIPS', 'ICML', 'ICLR', 'CVPR', 'ICCV', 'ECCV', 'ICRA', 'AAAI', 'GLOBECOM', 'INFOCOM', 'MOBICOM'];
    for (const conf of conferences) {
        if (s.includes(conf)) {
            if (year) {
                const yearStr = String(year);
                if (yearStr.length === 4) {
                    suffix = "'" + yearStr.substring(2);
                }
            }
            return conf + suffix + revisionSuffix;
        }
    }

    if (s.toLowerCase().includes('arxiv')) {
        return 'ArXiv' + revisionSuffix;
    }

    // IEEE journals
    if (s.includes('TDSC')) return 'IEEE TDSC' + revisionSuffix;
    if (s.includes('TMC')) return 'IEEE TMC' + revisionSuffix;
    if (s.includes('JSAC')) return 'IEEE JSAC' + revisionSuffix;
    if (s.includes('TGCN')) return 'IEEE TGCN' + revisionSuffix;
    if (s.includes('LNET')) return 'IEEE LNET' + revisionSuffix;
    if (s.includes('TNSE')) return 'IEEE TNSE' + revisionSuffix;
    if (s.includes('IOTJ') || s.includes('IoTJ')) return 'IEEE IoTJ' + revisionSuffix;

    // Astronomy & Astrophysics journals (return abbreviation as-is)
    if (s === 'PRD' || s === 'PRL' || s === 'PRX') return s + revisionSuffix;
    if (s === 'ApJ' || s === 'AJ' || s === 'A&A') return s + revisionSuffix;
    if (s === 'MNRAS') return s + revisionSuffix;
    if (s === 'JCAP') return s + revisionSuffix;
    if (s === 'Innovation') return s + revisionSuffix;

    return s || 'Preprint';
}

function getVenueFullName(venueStr, year) {
    if (!venueStr) {
        return '';
    }

    const s = venueStr.replace(/\d{4}/g, '').trim();

    // IEEE journals (No year)
    if (s.includes('TDSC')) return 'IEEE Transactions on Dependable and Secure Computing';
    if (s.includes('TMC')) return 'IEEE Transactions on Mobile Computing';
    if (s.includes('JSAC')) return 'IEEE Journal on Selected Areas in Communications';
    if (s.includes('TGCN')) return 'IEEE Transactions on Green Communications and Networking';
    if (s.includes('TNSE')) return 'IEEE Transactions on Network Science and Engineering';
    if (s.includes('IoTJ') || s.includes('IOTJ')) return 'IEEE Internet of Things Journal';
    if (s.includes('LNET') || s.includes('LNet')) return 'IEEE Networking Letters';

    // Conferences (full name without year suffix — year is shown in the short tag)
    if (s.includes('NeurIPS')) return 'Annual Conference on Neural Information Processing Systems';
    if (s.includes('ICML')) return 'International Conference on Machine Learning';
    if (s.includes('ICLR')) return 'International Conference on Learning Representations';
    if (s.includes('CVPR')) return 'IEEE/CVF Conference on Computer Vision and Pattern Recognition';
    if (s.includes('ICCV')) return 'IEEE/CVF International Conference on Computer Vision';
    if (s.includes('ECCV')) return 'European Conference on Computer Vision';
    if (s.includes('ICRA')) return 'IEEE International Conference on Robotics and Automation';
    if (s.includes('AAAI')) return 'AAAI Conference on Artificial Intelligence';
    if (s.includes('GLOBECOM')) return 'IEEE Global Communications Conference';
    if (s.includes('INFOCOM')) return 'IEEE International Conference on Computer Communications';
    if (s.includes('MOBICOM')) return 'Annual International Conference on Mobile Computing and Networking';

    // Astronomy & Astrophysics journals
    if (s === 'ApJ') return 'The Astrophysical Journal';
    if (s === 'MNRAS') return 'Monthly Notices of the Royal Astronomical Society';
    if (s === 'A&A') return 'Astronomy & Astrophysics';
    if (s === 'AJ') return 'The Astronomical Journal';
    if (s === 'PRD') return 'Physical Review D';
    if (s === 'PRL') return 'Physical Review Letters';
    if (s === 'PRX') return 'Physical Review X';
    if (s === 'JCAP') return 'Journal of Cosmology and Astroparticle Physics';
    if (s === 'Innovation') return 'The Innovation';

    // Nature Astronomy
    if (s.toLowerCase().includes('nature astronomy')) return 'Nature Astronomy';

    if (s.toLowerCase().includes('arxiv')) return 'arXiv preprint';

    return s;
}

function getCCFRank(fullName, originalVenue) {
    const v = (fullName + ' ' + originalVenue).toLowerCase();

    // CCF-A
    if (v.includes('tdsc') || v.includes('dependable and secure') ||
        v.includes('tmc') || v.includes('mobile computing') ||
        v.includes('aaai') || v.includes('neurips') ||
        v.includes('cvpr') || v.includes('iccv') ||
        v.includes('icml') || v.includes('iclr') ||
        v.includes('infocom') || v.includes('jsac')) {
        return 'A';
    }

    // CCF-B
    if (v.includes('icra')) {
        return 'B';
    }

    // CCF-C
    if (v.includes('globecom')) {
        return 'C';
    }

    return null;
}

// ============================================================
// News & Honors rendering
// ============================================================

function renderNewsItems(newsData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('News container not found:', containerId);
        return;
    }

    container.innerHTML = '';

    newsData.forEach(newsItem => {
        const newsElement = document.createElement('div');
        newsElement.className = 'news-item';

        const dateElement = document.createElement('span');
        dateElement.className = 'news-date';
        dateElement.textContent = newsItem.date;

        const contentElement = document.createElement('div');
        contentElement.className = 'news-content';

        const textSpan = document.createElement('span');
        textSpan.innerHTML = '🎉 ' + newsItem.content;
        contentElement.appendChild(textSpan);

        if (newsItem.links && newsItem.links.length > 0) {
            newsItem.links.forEach(link => {
                const space = document.createTextNode(' ');
                contentElement.appendChild(space);

                const linkElement = document.createElement('a');
                linkElement.href = link.url;
                linkElement.textContent = link.text;
                if (link.url && !link.url.startsWith('#')) {
                    linkElement.setAttribute('target', '_blank');
                }
                contentElement.appendChild(linkElement);
            });
        }

        if (newsItem.link && newsItem.link !== '#' && (!newsItem.links || newsItem.links.length === 0)) {
            const space = document.createTextNode(' ');
            contentElement.appendChild(space);

            const linkElement = document.createElement('a');
            linkElement.href = newsItem.link;
            linkElement.textContent = '[Link]';
            linkElement.setAttribute('target', '_blank');
            contentElement.appendChild(linkElement);
        }

        newsElement.appendChild(dateElement);
        newsElement.appendChild(contentElement);
        container.appendChild(newsElement);
    });
}

function renderHonorsItems(honorsData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('Honors container not found:', containerId);
        return;
    }

    container.innerHTML = '';

    honorsData.forEach(honor => {
        const honorElement = document.createElement('div');
        honorElement.className = 'honor-item';

        const yearElement = document.createElement('div');
        yearElement.className = 'honor-year';
        yearElement.textContent = honor.date;

        const contentElement = document.createElement('div');
        contentElement.className = 'honor-content';

        const titleElement = document.createElement('h3');
        titleElement.textContent = honor.title;

        const orgElement = document.createElement('p');
        orgElement.className = 'text-sm text-neutral-600';
        orgElement.textContent = honor.org;

        contentElement.appendChild(titleElement);
        contentElement.appendChild(orgElement);

        honorElement.appendChild(yearElement);
        honorElement.appendChild(contentElement);

        container.appendChild(honorElement);
    });
}

// ============================================================
// Utility helpers
// ============================================================

function getDataPath(fileName) {
    return window.location.pathname.includes('/pages/') ? `../data/${fileName}` : `data/${fileName}`;
}

function normalizeAssetPath(path) {
    if (!path) {
        return path;
    }

    if (/^(https?:|mailto:|tel:|#)/i.test(path)) {
        return path;
    }

    if (window.location.pathname.includes('/pages/') && !path.startsWith('../')) {
        return `../${path}`;
    }

    return path;
}

function hasUsableLink(path) {
    return Boolean(path) && path !== '#';
}

function handleJsonResponse(response) {
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
}

// Helper to open all external links in new tab
function makeAllLinksOpenInNewTab() {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        if (link.hostname !== window.location.hostname && link.getAttribute('href') && !link.getAttribute('href').startsWith('#') && !link.getAttribute('href').startsWith('mailto:')) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });
}

// Helper to setup MutationObserver for dynamically added links
function setupLinkObserver() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'A') {
                            if (node.hostname !== window.location.hostname && node.getAttribute('href') && !node.getAttribute('href').startsWith('#') && !node.getAttribute('href').startsWith('mailto:')) {
                                node.setAttribute('target', '_blank');
                                node.setAttribute('rel', 'noopener noreferrer');
                            }
                        }
                        const links = node.querySelectorAll('a');
                        links.forEach(link => {
                            if (link.hostname !== window.location.hostname && link.getAttribute('href') && !link.getAttribute('href').startsWith('#') && !link.getAttribute('href').startsWith('mailto:')) {
                                link.setAttribute('target', '_blank');
                                link.setAttribute('rel', 'noopener noreferrer');
                            }
                        });
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function setupEmailPopCopy() {
    const btn = document.querySelector('.email-pop');
    if (!btn) return;

    const emailSpan = btn.querySelector('.pop-text');
    const email = (emailSpan ? emailSpan.textContent : '').trim();
    if (!email) return;

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        btn.classList.toggle('is-open');

        if (btn.classList.contains('is-open')) {
            try {
                await navigator.clipboard.writeText(email);
                if (emailSpan) {
                    const old = emailSpan.textContent;
                    emailSpan.textContent = 'Copied! ' + old;
                    setTimeout(() => { emailSpan.textContent = old; }, 900);
                }
            } catch (err) {
                // 如果剪贴板权限失败，就只显示邮箱，不报错
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target)) btn.classList.remove('is-open');
    });
}

function loadLastUpdated() {
    let jsonPath = 'data/last_updated.json';
    if (window.location.pathname.includes('/pages/')) {
        jsonPath = '../data/last_updated.json';
    }

    fetch(jsonPath, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
            const el = document.getElementById('last-updated');
            if (el && d.last_updated) el.textContent = d.last_updated;
        })
        .catch(() => {});
}
