import pytest

@pytest.fixture
def playwright_page(browser):
    context = browser.new_context()
    page = context.new_page()
    yield page
    context.close()
