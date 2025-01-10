import os
import requests
import sys
import signal
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException, JavascriptException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from urllib.parse import urlparse
import time
from dotenv import load_dotenv
import logging
import re
import concurrent.futures
import hashlib

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()

def setup_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("start-maximized")
    return webdriver.Chrome(options=options)

def login_to_poe(driver, email):
    try:
        # Navigate to the login page
        logging.info("Navigating to login page...")
        driver.get("https://poe.com/login")
        
        # Wait for the email input field to be present

        logging.info("Waiting for email input field...")
        email_input = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
        )

        # Debug: Print the value we're about to enter
        logging.info(f"Attempting to enter email: {email}")
        
        # Enter email
        email_input.clear()  # Clear any existing value

        logging.info("Entering email...")
        email_input.send_keys(email)
        
        # Debug: Print the value after entering
        entered_email = email_input.get_attribute('value')
        logging.info(f"Email entered in the field: {entered_email}")
        
        # Find and click the "Go" button

        logging.info("Clicking Go button...")
        go_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[text()='Go']"))
        )
        go_button.click()
        
        # Wait for the verification code input field

        logging.info("Waiting for verification code input...")
        verification_input = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input.VerificationCodeInput_verificationCodeInput__RgX85"))
        )
        
        # Prompt user for verification code

        verification_code = input("Enter the verification code sent to your email: ")
        verification_input.send_keys(verification_code)
        
        # Find and click the "Log In" button

        logging.info("Clicking Log In button...")
        login_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'Button_buttonBase__Bv9Vx') and contains(@class, 'Button_primary__6UIn0') and text()='Log In']"))
        )
        login_button.click()
        
        # Wait for a short time to allow login process to complete

        logging.info("Waiting for login to complete...")
        time.sleep(5)  # Wait for 5 seconds
        
        time.sleep(5)

        logging.info("Login process completed.")
    except TimeoutException as e:
        logging.error(f"Timeout occurred: {str(e)}")
        logging.info("Current page source:")
        logging.info(driver.page_source)
        raise
    except NoSuchElementException as e:
        logging.error(f"Element not found: {str(e)}")
        logging.info("Current page source:")
        logging.info(driver.page_source)
        raise
    except Exception as e:
        logging.error(f"An unexpected error occurred: {str(e)}")
        raise

def scroll_and_collect_messages(driver, max_scroll_time=600):
    logging.info("Starting scroll and collect process...")
    start_time = time.time()
    scroll_pause_time = 4  # Increased to allow more time for content to load
    last_message_count = 0
    consecutive_same_count = 0
    max_retries = 5
    
    try:
        while time.time() - start_time < max_scroll_time:
            # Get current messages to track progress
            current_messages = driver.find_elements(By.CSS_SELECTOR, "div.ChatMessagesView_messagePair__ZEXUz")
            current_count = len(current_messages)
            logging.info(f"Current visible messages: {current_count}")

            # First try to find the infinite scroll trigger
            try:
                # Look for the trigger element that indicates more content can be loaded
                trigger = driver.find_element(By.CSS_SELECTOR, "div.InfiniteScroll_pagingTrigger__cdz9I")
                if trigger:
                    logging.info("Found infinite scroll trigger, scrolling to it...")
                    driver.execute_script("arguments[0].scrollIntoView({ behavior: 'smooth' });", trigger)
                    
                    # Wait for potential loading indicator
                    try:
                        loading = WebDriverWait(driver, 2).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, "div[class*='LoadingIndicator']"))
                        )
                        if loading:
                            logging.info("Loading indicator visible, waiting...")
                            # Wait for it to disappear
                            WebDriverWait(driver, 10).until(
                                EC.invisibility_of_element(loading)
                            )
                    except TimeoutException:
                        pass  # No loading indicator found, which is fine
                        
                    time.sleep(scroll_pause_time)  # Give time for content to render
            except NoSuchElementException:
                logging.info("No more scroll trigger found - may have reached the top")
                # Try one more small scroll up to be sure
                driver.execute_script("""
                    const container = document.querySelector('div.ChatMessagesScrollWrapper_scrollableContainerWrapper__x8H60');
                    if (container) container.scrollTo({top: 0, behavior: 'smooth'});
                """)
                time.sleep(scroll_pause_time)
            
            # Check if we've loaded new messages
            new_messages = driver.find_elements(By.CSS_SELECTOR, "div.ChatMessagesView_messagePair__ZEXUz")
            new_count = len(new_messages)
            
            # Get scroll position to verify we're actually moving
            scroll_position = driver.execute_script("""
                const container = document.querySelector('div.ChatMessagesScrollWrapper_scrollableContainerWrapper__x8H60');
                return container ? container.scrollTop : 0;
            """)
            
            logging.info(f"Messages after scroll: {new_count} (was {current_count}). Scroll position: {scroll_position}")
            
            if new_count > current_count:
                consecutive_same_count = 0
                last_message_count = new_count
                logging.info("Found new messages, continuing to scroll...")
            else:
                consecutive_same_count += 1
                logging.info(f"No new messages found. Attempt {consecutive_same_count}/{max_retries}")
                
                # If we're at the top and have tried a few times, we're done
                if scroll_position == 0 and consecutive_same_count >= max_retries:
                    logging.info("Reached top of conversation and no new messages found")
                    break
                elif consecutive_same_count >= max_retries:
                    logging.info("No new messages after several attempts")
                    break

    except Exception as e:
        logging.error(f"Error during scroll process: {str(e)}")
        logging.error(f"Error details: {str(e.__class__.__name__)}: {str(e)}")
    
    # Final wait to ensure everything is loaded
    time.sleep(scroll_pause_time * 2)
    
    duration = time.time() - start_time
    logging.info(f"Scrolling completed in {duration:.2f} seconds. Final message count: {last_message_count}")
    return collect_all_messages(driver)

def collect_all_messages(driver):
    logging.info("Collecting all message pairs after scrolling...")
    messages = []
    
    # Look for message pairs
    message_pairs = driver.find_elements(By.CSS_SELECTOR, "div.ChatMessagesView_messagePair__ZEXUz")
    logging.info(f"Found {len(message_pairs)} message pairs")
    
    for pair in message_pairs:
        try:
            # Initialize message components
            user_message = ""
            bot_message = ""
            bot_attachments = []
            user_attachments = []
            
            # Process each message wrapper in the pair
            message_wrappers = pair.find_elements(By.CSS_SELECTOR, "div.ChatMessage_messageWrapper__4Ugd6")
            
            for wrapper in message_wrappers:
                # Check if this is a right-side (human) or left-side (bot) message
                is_human = "rightSideMessageWrapper" in wrapper.get_attribute("class")
                
                # Get text content
                text_elements = wrapper.find_elements(By.CSS_SELECTOR, "div.Message_messageTextContainer__w64Sc p")
                message_text = "\n".join([elem.text for elem in text_elements if not elem.get_attribute("class") or "MarkdownImage_imageContainer" not in elem.get_attribute("class")]).strip()
                
                # Get image attachments
                image_elements = wrapper.find_elements(By.CSS_SELECTOR, "span.MarkdownImage_imageContainer__rAeth img")
                attachments = []
                
                for img in image_elements:
                    try:
                        image_url = img.get_attribute("src")
                        if image_url:
                            attachments.append({
                                'type': 'image',
                                'url': image_url
                            })
                    except Exception as e:
                        logging.warning(f"Error extracting image URL: {str(e)}")
                        continue
                
                if is_human:
                    user_message = message_text
                    user_attachments = attachments
                else:
                    bot_message = message_text
                    bot_attachments = attachments
            
            # Only add the pair if there's content (text or attachments)
            if user_message or bot_message or user_attachments or bot_attachments:
                messages.append({
                    'human': {
                        'text': user_message,
                        'attachments': user_attachments
                    },
                    'bot': {
                        'text': bot_message,
                        'attachments': bot_attachments
                    }
                })
                
        except (NoSuchElementException, StaleElementReferenceException) as e:
            logging.warning(f"Error collecting message pair: {str(e)}")
            continue
        except Exception as e:
            logging.error(f"Unexpected error while collecting message: {str(e)}")
            continue
    
    logging.info(f"Total collected message pairs: {len(messages)}")
    return messages
    scroll_pause_time = 2
    no_new_messages_count = 0
    max_no_new_messages = 5  # After this many scrolls with no new messages, we'll stop

    scroll_container_js_path = """document.querySelector("div[class*='ChatMessagesScrollWrapper']")"""

    while time.time() - start_time < max_scroll_time:
        # Scroll to top
        driver.execute_script(f"arguments[0].scrollTop = 0;", driver.execute_script(f"return {scroll_container_js_path}"))
        time.sleep(scroll_pause_time)

        # Find all message pairs
        message_pairs = driver.find_elements(By.CSS_SELECTOR, "div[class*='ChatMessagesView_messagePair']")

        new_messages_found = False
        for pair in message_pairs:
            try:
                human_message = ""
                bot_message = ""

                human_elements = pair.find_elements(By.CSS_SELECTOR, "div.ChatMessage_rightSideMessageWrapper__r0roB div.Message_rightSideMessageBubble__ioa_i > div > p")
                bot_elements = pair.find_elements(By.CSS_SELECTOR, "div.Message_leftSideMessageBubble__VPdk6 > div > p")

                if human_elements:
                    human_message = human_elements[0].text
                if bot_elements:
                    bot_message = bot_elements[0].text

                # If either message is non-empty, add the pair
                if human_message or bot_message:
                    if (human_message, bot_message) not in messages:
                        messages.append((human_message, bot_message))
                        new_messages_found = True
                        logging.info(f"New message pair found. Human: {human_message[:50]}... Bot: {bot_message[:50]}...")
            except Exception as e:
                logging.error(f"Error extracting message pair: {str(e)}")

        if new_messages_found:
            no_new_messages_count = 0
        else:
            no_new_messages_count += 1
            logging.info(f"No new messages found. Count: {no_new_messages_count}")

        if no_new_messages_count >= max_no_new_messages:
            logging.info("Reached the top of the chat or no new messages. Stopping scroll.")
            break

        # If no new messages, try to scroll more
        try:
            trigger = driver.find_element(By.CSS_SELECTOR, "div[class*='InfiniteScroll_pagingTrigger']")
            driver.execute_script("arguments[0].scrollIntoView(true);", trigger)
        except NoSuchElementException:
            logging.info("Infinite scroll trigger not found. Might have reached the top.")
            break

    logging.info(f"Scrolling completed in {time.time() - start_time:.2f} seconds")

    # Extract bot name
    try:
        bot_name_element = driver.find_element(By.CSS_SELECTOR, "div[class*='BotHeader_textContainer'] p")
        bot_name = bot_name_element.text
        logging.info(f"Bot name found: {bot_name}")
    except NoSuchElementException:
        bot_name = None
        logging.warning("Bot name not found")

    return messages[::-1], bot_name  # Reverse the list to get oldest messages first

def format_and_save_messages(messages, save_dir, chat_url, bot_name):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    url_part = urlparse(chat_url).path.split('/')[-1][:20]
    filename = f"poe_chat_{url_part}_{timestamp}.txt"
    filepath = os.path.join(save_dir, filename)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"Poe Chat Transcript\n")
        f.write(f"URL: {chat_url}\n")
        f.write(f"Bot Name: {bot_name or 'Unknown'}\n")
        f.write(f"Downloaded on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("=" * 80 + "\n\n")
        for i, (human, bot) in enumerate(messages, 1):
            f.write(f"Message Pair {i}:\n")
            if human:
                f.write("Human: " + human.strip() + "\n\n")
            if bot:
                f.write(f"{bot_name or 'Bot'}: " + bot.strip() + "\n\n")
            if not human and not bot:
                f.write("(Empty message pair)\n\n")
            f.write("-" * 80 + "\n\n")
    logging.info(f"Messages saved to {filepath}")
    return filepath

def save_poe_chat_text(url, save_dir):
    email = os.getenv('POE_EMAIL')
    if not email:
        raise ValueError("POE_EMAIL environment variable is not set")

    driver = setup_driver()
    messages = []
    bot_name = None

    def signal_handler(sig, frame):
        logging.info("Interrupt received, saving collected messages...")
        if messages:
            saved_file = format_and_save_messages(messages, save_dir, url, bot_name)
            print(f"Partial chat transcript saved to: {saved_file}")
        driver.quit()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    try:
        login_to_poe(driver, email)

        logging.info(f"Navigating to chat URL: {url}")
        driver.get(url)

        try:
            WebDriverWait(driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div[class*='ChatMessagesView_messagePair']"))
            )
            logging.info("Chat messages loaded successfully")
        except TimeoutException:
            logging.warning("Timeout waiting for chat messages to load. Proceeding anyway...")
        
        messages = scroll_and_collect_messages(driver)

        # Add a longer delay to ensure all messages are loaded
        time.sleep(10)

        messages, bot_name = scroll_and_collect_messages(driver)
        logging.info(f"Collected {len(messages)} message pairs")

        os.makedirs(save_dir, exist_ok=True)
        
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filepath = os.path.join(save_dir, f"poe_chat_{timestamp}.txt")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            for i, message in enumerate(messages, 1):
                f.write(f"Message Pair {i}:\n")
                
                # Write human message
                if message['human']['text'] or message['human']['attachments']:
                    f.write("Human:\n")
                    if message['human']['text']:
                        f.write(message['human']['text'] + "\n")
                    for attachment in message['human']['attachments']:
                        f.write(f"[Attachment: {attachment['type']} - {attachment['url']}]\n")
                    f.write("\n")
                
                # Write bot message
                if message['bot']['text'] or message['bot']['attachments']:
                    f.write("Bot:\n")
                    if message['bot']['text']:
                        f.write(message['bot']['text'] + "\n")
                    for attachment in message['bot']['attachments']:
                        f.write(f"[Attachment: {attachment['type']} - {attachment['url']}]\n")
                    f.write("\n")
                
                f.write("-" * 80 + "\n\n")
        
        logging.info(f"Messages saved to {filepath}")
        saved_file = format_and_save_messages(messages, save_dir, url, bot_name)
        print(f"Chat transcript saved to: {saved_file}")

    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        if messages:
            saved_file = format_and_save_messages(messages, save_dir, url, bot_name)
            print(f"Partial chat transcript saved to: {saved_file}")
    finally:
        driver.quit()

if __name__ == "__main__":
    poe_chat_url = input("Enter the Poe chat URL: ")
    save_directory = input("Enter the directory to save the transcript (default: PoeChatTranscripts): ") or "PoeChatTranscripts"
    save_poe_chat_text(poe_chat_url, save_directory)
